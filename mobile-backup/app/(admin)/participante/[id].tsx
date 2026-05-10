import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { adminService } from '@/services/admin.service';
import { useAppAlert } from '@/hooks/useAppAlert';
import { ParticipanteResponse } from '@/types/api.types';

const STATUS_COLOR: Record<string, string> = {
  ATIVO: Colors.Success,
  INATIVO: Colors.TextMuted,
  SUSPENSO: Colors.Error,
  PENDENTE_VERIFICACAO: '#FF9800',
  BLOQUEADO: Colors.Error,
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  SUSPENSO: 'Suspenso',
  PENDENTE_VERIFICACAO: 'Pendente',
  BLOQUEADO: 'Bloqueado',
};

const TIPO_LABEL: Record<string, string> = {
  PASSAGEIRO: 'Passageiro',
  MOTORISTA: 'Motorista',
  ADMIN: 'Admin',
};

export default function ParticipanteDetalheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert, alertModal } = useAppAlert();
  const [participante, setParticipante] = useState<ParticipanteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const p = await adminService.buscarParticipante(Number(id));
      setParticipante(p);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível carregar o participante.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSuspender = () => {
    if (!participante) return;
    showAlert('Suspender conta', `Suspender a conta de ${participante.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Suspender',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await adminService.suspenderParticipante(participante.id);
            setParticipante(prev => prev ? { ...prev, status: 'SUSPENSO' } : prev);
          } catch (e: unknown) {
            showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível suspender.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDessuspender = async () => {
    if (!participante) return;
    setActionLoading(true);
    try {
      await adminService.dessuspenderParticipante(participante.id);
      setParticipante(prev => prev ? { ...prev, status: 'ATIVO' } : prev);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível reativar.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes</Text>
          <View style={{ width: 30 }} />
        </View>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.Primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!participante) return null;

  const statusColor = STATUS_COLOR[participante.status] ?? Colors.TextMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{participante.nome}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Perfil */}
        <View style={styles.perfil}>
          <View style={styles.avatarWrap}>
            {participante.fotoPerfilUrl
              ? <Image source={{ uri: participante.fotoPerfilUrl }} style={styles.avatar} />
              : <Text style={styles.avatarText}>{participante.nome.charAt(0).toUpperCase()}</Text>
            }
            {participante.verificado && (
              <View style={styles.verificadoBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.nome}>{participante.nome}</Text>
          {participante.username && (
            <Text style={styles.username}>@{participante.username}</Text>
          )}
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: Colors.Primary + '15' }]}>
              <Text style={[styles.badgeText, { color: Colors.Primary }]}>
                {TIPO_LABEL[participante.tipo] ?? participante.tipo}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {STATUS_LABEL[participante.status] ?? participante.status}
              </Text>
            </View>
            {participante.mediaAvaliacoes != null && (
              <View style={[styles.badge, { backgroundColor: '#FF9800' + '15' }]}>
                <Ionicons name="star" size={11} color="#FF9800" />
                <Text style={[styles.badgeText, { color: '#FF9800' }]}>
                  {participante.mediaAvaliacoes.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dados pessoais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <InfoRow icon="card-outline" label="CPF" value={participante.cpf} />
          <InfoRow icon="mail-outline" label="E-mail" value={participante.emailPessoal} />
          {participante.emailInstitucional && (
            <InfoRow icon="school-outline" label="E-mail inst." value={participante.emailInstitucional} />
          )}
          {participante.instituicao && (
            <InfoRow icon="business-outline" label="Instituição" value={`${participante.instituicao.sigla} — ${participante.instituicao.cidade}`} />
          )}
          <InfoRow icon="calendar-outline" label="Membro desde" value={new Date(participante.criadoEm).toLocaleDateString('pt-BR')} />
        </View>

        {/* Motorista */}
        {participante.tipo === 'MOTORISTA' && participante.cnh && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motorista</Text>
            <InfoRow icon="ribbon-outline" label="CNH" value={participante.cnh} />
            {participante.validadeCnh && (
              <InfoRow icon="time-outline" label="Validade CNH" value={participante.validadeCnh} />
            )}
            {participante.veiculo && (
              <InfoRow
                icon="car-outline"
                label="Veículo"
                value={`${participante.veiculo.marca} ${participante.veiculo.modelo} ${participante.veiculo.ano} — ${participante.veiculo.placa}`}
              />
            )}
          </View>
        )}

        {/* Endereços */}
        {participante.enderecos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Endereços</Text>
            {participante.enderecos.map(e => (
              <InfoRow
                key={e.id}
                icon="location-outline"
                label={e.nome ?? e.bairro}
                value={`${e.rua}, ${e.numero} — ${e.bairro}, ${e.cidade}/${e.estado}`}
              />
            ))}
          </View>
        )}

        {/* Telefones */}
        {participante.telefones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telefones</Text>
            {participante.telefones.map(t => (
              <InfoRow
                key={t.id}
                icon="call-outline"
                label={t.tipo}
                value={`(${t.ddd}) ${t.numero}`}
              />
            ))}
          </View>
        )}

        {/* Ações admin */}
        {participante.tipo !== 'ADMIN' && (
          <View style={styles.actions}>
            {participante.status === 'SUSPENSO' ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess, actionLoading && { opacity: 0.5 }]}
                onPress={handleDessuspender}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Reativar conta</Text>
                    </>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger, actionLoading && { opacity: 0.5 }]}
                onPress={handleSuspender}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="ban-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Suspender conta</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {alertModal}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.Primary} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.SurfaceLight },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.Surface,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.Text, flex: 1, textAlign: 'center' },

  content: { padding: 16, gap: 12, paddingBottom: 40 },

  perfil: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarText: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.Primary,
    color: '#fff', fontSize: 28, fontWeight: '700',
    textAlign: 'center', lineHeight: 80,
  },
  verificadoBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  nome:     { fontSize: 20, fontWeight: '800', color: Colors.Text },
  username: { fontSize: 14, color: Colors.TextMuted },
  badges:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:{ fontSize: 12, fontWeight: '600' },

  section: {
    backgroundColor: Colors.Surface, borderRadius: 14,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.TextMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIcon:  { marginTop: 1 },
  infoLabel: { fontSize: 13, color: Colors.TextMuted, minWidth: 80 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.Text, flex: 1 },

  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  actionBtnSuccess: { backgroundColor: Colors.Success },
  actionBtnDanger:  { backgroundColor: Colors.Error },
  actionBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
