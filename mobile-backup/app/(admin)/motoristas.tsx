import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { adminService } from '@/services/admin.service';
import { ParticipanteResponse } from '@/types/api.types';

export default function MotoristasScreen() {
  const [motoristas, setMotoristas] = useState<ParticipanteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rejeitar, setRejeitar] = useState<{ id: number; nome: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const pageRef = React.useRef(page);
  const totalPagesRef = React.useRef(totalPages);
  pageRef.current = page;
  totalPagesRef.current = totalPages;

  const carregar = useCallback(async (reset = false) => {
    const p = reset ? 0 : pageRef.current;
    if (!reset && p >= totalPagesRef.current) return;

    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await adminService.listarMotoristasNaoAprovados(p);
      setMotoristas(prev => (reset ? res.content : [...prev, ...res.content]));
      setTotalPages(res.totalPages);
      setPage(p + 1);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar os motoristas.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { carregar(true); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setTotalPages(1);
    await carregar(true);
    setRefreshing(false);
  };

  const handleAprovar = (id: number, nome: string) => {
    Alert.alert('Aprovar motorista', `Aprovar ${nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: async () => {
          setActionLoading(true);
          try {
            await adminService.aprovarMotorista(id);
            setMotoristas(prev => prev.filter(m => m.id !== id));
          } catch {
            Alert.alert('Erro', 'Não foi possível aprovar o motorista.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRejeitar = async () => {
    if (!rejeitar) return;
    setActionLoading(true);
    try {
      await adminService.rejeitarMotorista(rejeitar.id, motivo.trim() || undefined);
      setMotoristas(prev => prev.filter(m => m.id !== rejeitar.id));
      setRejeitar(null);
      setMotivo('');
    } catch {
      Alert.alert('Erro', 'Não foi possível rejeitar a solicitação.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ParticipanteResponse }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.fotoPerfilUrl ? (
          <Image source={{ uri: item.fotoPerfilUrl }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoPlaceholder]}>
            <Ionicons name="person" size={24} color={Colors.TextMuted} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.detalhe}>{item.emailPessoal}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detalhes}>
        <View style={styles.detalheRow}>
          <Ionicons name="card-outline" size={14} color={Colors.TextMuted} />
          <Text style={styles.detalhe}>
            CNH: {item.cnh ?? '—'}
            {item.validadeCnh ? `  ·  Validade: ${item.validadeCnh}` : ''}
          </Text>
        </View>
        {item.veiculo && (
          <View style={styles.detalheRow}>
            <Ionicons name="car-outline" size={14} color={Colors.TextMuted} />
            <Text style={styles.detalhe}>
              {item.veiculo.marca} {item.veiculo.modelo} — {item.veiculo.placa}
            </Text>
          </View>
        )}
        <View style={styles.detalheRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.TextMuted} />
          <Text style={styles.detalhe}>
            Cadastro: {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        {item.instituicao && (
          <View style={styles.detalheRow}>
            <Ionicons name="school-outline" size={14} color={Colors.TextMuted} />
            <Text style={styles.detalhe}>{item.instituicao.nome}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnRejeitar]}
          onPress={() => setRejeitar({ id: item.id, nome: item.nome })}
          disabled={actionLoading}
        >
          <Ionicons name="close-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Rejeitar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnAprovar]}
          onPress={() => handleAprovar(item.id, item.nome)}
          disabled={actionLoading}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Aprovar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Motoristas Pendentes</Text>
        {motoristas.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{motoristas.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.Primary} />
      ) : (
        <FlatList
          data={motoristas}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={motoristas.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.Primary]} />}
          onEndReached={() => carregar()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.Primary} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={Colors.Primary} />
              <Text style={styles.emptyTitulo}>Tudo em dia!</Text>
              <Text style={styles.emptyTexto}>Nenhum motorista aguardando aprovação.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!rejeitar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Rejeitar solicitação</Text>
            <Text style={styles.modalSubtitulo}>{rejeitar?.nome}</Text>
            <TextInput
              style={styles.input}
              placeholder="Motivo (opcional)"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancelar]}
                onPress={() => { setRejeitar(null); setMotivo(''); }}
                disabled={actionLoading}
              >
                <Text style={[styles.btnText, { color: Colors.TextMuted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnRejeitar]}
                onPress={handleRejeitar}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnText}>Rejeitar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.Surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 10,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: Colors.Text },
  badge: {
    backgroundColor: Colors.Primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  foto: { width: 52, height: 52, borderRadius: 26 },
  fotoPlaceholder: {
    backgroundColor: Colors.SurfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  nome: { fontSize: 15, fontWeight: '600', color: Colors.Text },
  username: { fontSize: 13, color: Colors.Primary, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  detalhes: { gap: 6 },
  detalheRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detalhe: { fontSize: 13, color: Colors.TextMuted, flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnAprovar: { backgroundColor: Colors.Success },
  btnRejeitar: { backgroundColor: Colors.Error },
  btnCancelar: { backgroundColor: '#F0F0F0' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 80 },
  emptyTitulo: { fontSize: 18, fontWeight: '700', color: Colors.Text },
  emptyTexto: { fontSize: 14, color: Colors.TextMuted, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.Surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: Colors.Text },
  modalSubtitulo: { fontSize: 14, color: Colors.TextMuted },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: Colors.InputBg,
  },
});
