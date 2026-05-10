import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { SolicitacaoResponse, StatusSolicitacao } from '@/types/api.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrai "Rua, Número, Bairro" de uma string de endereço completo. */
function resumirEndereco(endereco: string): string {
  const partes = endereco.split(',').map((p) => p.trim());
  return partes.slice(0, 3).join(', ');
}

const STATUS_LABEL: Record<StatusSolicitacao, string> = {
  PENDENTE:  'Pendente',
  APROVADA:  'Aprovada',
  RECUSADA:  'Recusada',
  EMBARCADO: 'Embarcado',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_COLOR: Record<StatusSolicitacao, string> = {
  PENDENTE:  '#FF9800',
  APROVADA:  Colors.Success,
  RECUSADA:  Colors.Error,
  EMBARCADO: '#2196F3',
  CONCLUIDA: '#9E9E9E',
  CANCELADA: '#9E9E9E',
};

// ── Card: solicitação recebida (visão do motorista) ───────────────────────────

function CardRecebida({
  item,
  index,
  atualizando,
  onAprovar,
  onRecusar,
}: {
  item: SolicitacaoResponse;
  index: number;
  atualizando: number | null;
  onAprovar: (id: number) => void;
  onRecusar: (id: number) => void;
}) {
  const cor = STATUS_COLOR[item.status];
  const inicial = (item.nomePassageiro ?? 'P').charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.passageiroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNome} numberOfLines={1}>
              {item.nomePassageiro ?? `Passageiro #${item.passageiroId}`}
            </Text>
            <Text style={styles.cardSub}>{item.nomeCarona ?? (item.direcao === 'IDA' ? 'Ida' : item.direcao === 'VOLTA' ? 'Volta' : 'Carona')}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
          <Text style={[styles.statusText, { color: cor }]}>{STATUS_LABEL[item.status]}</Text>
        </View>
      </View>

      {item.enderecoDestino && (
        <Text style={styles.cardDetalhe}>📍 {resumirEndereco(item.enderecoDestino)}</Text>
      )}
      {item.mensagem && (
        <Text style={styles.cardMensagem}>"{item.mensagem}"</Text>
      )}

      <View style={styles.cardActions}>
        {item.status === 'PENDENTE' && (
          <>
            <TouchableOpacity
              style={[styles.btnAceitar, atualizando === item.id && styles.btnDisabled]}
              onPress={() => onAprovar(item.id)}
              disabled={atualizando === item.id}
            >
              <Text style={styles.btnAceitarText}>✓ Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnRecusar, atualizando === item.id && styles.btnDisabled]}
              onPress={() => onRecusar(item.id)}
              disabled={atualizando === item.id}
            >
              <Text style={styles.btnRecusarText}>✕ Recusar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ── Card: solicitação enviada (visão do passageiro) — só leitura ─────────────

function CardEnviada({
  item,
  index,
}: {
  item: SolicitacaoResponse;
  index: number;
}) {
  const cor = STATUS_COLOR[item.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNome}>{item.nomeCarona ?? (item.direcao === 'IDA' ? 'Ida' : item.direcao === 'VOLTA' ? 'Volta' : 'Carona')}</Text>
          {item.enderecoDestino && (
            <Text style={styles.cardSub} numberOfLines={1}>📍 {resumirEndereco(item.enderecoDestino)}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
          <Text style={[styles.statusText, { color: cor }]}>{STATUS_LABEL[item.status]}</Text>
        </View>
      </View>

      {item.mensagem && (
        <Text style={styles.cardMensagem}>"{item.mensagem}"</Text>
      )}
    </View>
  );
}

// ── Aba recebidas ─────────────────────────────────────────────────────────────

function AbaRecebidas() {
  const { showAlert, alertModal } = useAppAlert();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const todas = (await caronaService.listarSolicitacoesRecebidas()) ?? [];
      setSolicitacoes(todas.filter((s) => s.status === 'PENDENTE'));
    } catch {
      showAlert('Erro', 'Não foi possível carregar as solicitações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const executar = async (id: number, acao: () => Promise<SolicitacaoResponse>) => {
    setAtualizando(id);
    try {
      await acao();
      setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Erro ao processar.');
    } finally {
      setAtualizando(null);
    }
  };

  const handleAprovar = (id: number) =>
    executar(id, () => caronaService.aprovarSolicitacao(id));

  const handleRecusar = (id: number) =>
    showAlert('Recusar', 'Deseja recusar este passageiro?', [
      { text: 'Não', style: 'cancel', onPress: () => {} },
      { text: 'Recusar', style: 'destructive',
        onPress: () => executar(id, () => caronaService.recusarSolicitacao(id)) },
    ]);

  if (loading) {
    return <ActivityIndicator color={Colors.Primary} style={{ marginTop: 32 }} />;
  }

  return (
    <>
      <FlatList
        data={solicitacoes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        onRefresh={carregar}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma solicitação recebida.</Text>
        }
        renderItem={({ item, index }) => (
          <CardRecebida
            item={item}
            index={index}
            atualizando={atualizando}
            onAprovar={handleAprovar}
            onRecusar={handleRecusar}
          />
        )}
      />
      {alertModal}
    </>
  );
}

// ── Aba enviadas ──────────────────────────────────────────────────────────────

function AbaEnviadas() {
  const { showAlert, alertModal } = useAppAlert();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const todas = (await caronaService.listarMinhasSolicitacoes()) ?? [];
      setSolicitacoes(todas.filter((s) => s.status === 'PENDENTE' || s.status === 'APROVADA'));
    } catch {
      showAlert('Erro', 'Não foi possível carregar suas solicitações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) {
    return <ActivityIndicator color={Colors.Primary} style={{ marginTop: 32 }} />;
  }

  return (
    <>
      <FlatList
        data={solicitacoes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        onRefresh={carregar}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhuma solicitação enviada.</Text>
        }
        renderItem={({ item, index }) => (
          <CardEnviada item={item} index={index} />
        )}
      />
      {alertModal}
    </>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

type Aba = 'recebidas' | 'enviadas';

export default function SolicitacoesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isMotorista = user?.tipo === 'MOTORISTA';

  const [aba, setAba] = useState<Aba>('recebidas');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Solicitações</Text>
        <Text style={styles.subtitulo}>
          {isMotorista
            ? 'Gerencie quem quer entrar nas suas caronas.'
            : 'Acompanhe as vagas que você solicitou.'}
        </Text>
      </View>

      {/* Sub-tabs — apenas motorista vê "Recebidas" */}
      {isMotorista && (
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabItem, aba === 'recebidas' && styles.subTabItemAtivo]}
            onPress={() => setAba('recebidas')}
          >
            <Text style={[styles.subTabText, aba === 'recebidas' && styles.subTabTextAtivo]}>
              Recebidas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabItem, aba === 'enviadas' && styles.subTabItemAtivo]}
            onPress={() => setAba('enviadas')}
          >
            <Text style={[styles.subTabText, aba === 'enviadas' && styles.subTabTextAtivo]}>
              Enviadas
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conteúdo */}
      {isMotorista
        ? (aba === 'recebidas' ? <AbaRecebidas /> : <AbaEnviadas />)
        : <AbaEnviadas />
      }
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.SurfaceLight },
  header:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn:   { padding: 4 },
  titulo:    { fontSize: 24, fontWeight: '800', color: Colors.Primary },
  subtitulo: { fontSize: 13, color: Colors.TextMuted, marginTop: 2 },

  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(123,47,190,0.12)',
  },
  subTabItem:      { flex: 1, paddingVertical: 10, alignItems: 'center' },
  subTabItemAtivo: { borderBottomWidth: 2.5, borderBottomColor: Colors.Primary },
  subTabText:      { fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  subTabTextAtivo: { color: Colors.Primary },

  lista: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  vazio: { textAlign: 'center', color: Colors.TextMuted, marginTop: 40, fontSize: 14 },

  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  passageiroRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardNome:     { fontSize: 14, fontWeight: '700', color: Colors.Text },
  cardSub:      { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },
  cardDetalhe:  { fontSize: 13, color: Colors.TextMuted, marginBottom: 4 },
  cardMensagem: { fontSize: 13, color: Colors.Text, fontStyle: 'italic', marginBottom: 6 },

  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  cardActions:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnAceitar: {
    flex: 1, backgroundColor: Colors.Success,
    borderRadius: 20, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAceitarText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnRecusar: {
    flex: 1, backgroundColor: Colors.Error,
    borderRadius: 20, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnRecusarText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnNaoCompareceu: {
    flex: 1, borderRadius: 20, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.Error,
  },
  btnNaoCompareceuText: { color: Colors.Error, fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
