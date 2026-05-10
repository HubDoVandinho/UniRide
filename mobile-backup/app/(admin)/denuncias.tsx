import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { adminService, MOTIVOS_DENUNCIA_LABEL } from '@/services/admin.service';
import { DenunciaResponse, StatusDenuncia } from '@/types/api.types';

const ABAS: { label: string; value: StatusDenuncia }[] = [
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Arquivadas', value: 'ARQUIVADA' },
  { label: 'Suspensões', value: 'SUSPENSAO_APLICADA' },
];

export default function DenunciasScreen() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<StatusDenuncia>('PENDENTE');
  const [denuncias, setDenuncias] = useState<DenunciaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [revisando, setRevisando] = useState<DenunciaResponse | null>(null);
  const [notaAdmin, setNotaAdmin] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const pageRef = React.useRef(page);
  const totalPagesRef = React.useRef(totalPages);
  pageRef.current = page;
  totalPagesRef.current = totalPages;

  const carregar = useCallback(async (reset = false, status = abaAtiva) => {
    const p = reset ? 0 : pageRef.current;
    if (!reset && p >= totalPagesRef.current) return;

    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await adminService.listarDenuncias(status, p);
      setDenuncias(prev => (reset ? res.content : [...prev, ...res.content]));
      setTotalPages(res.totalPages);
      setPage(p + 1);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar as denúncias.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [abaAtiva]);

  useEffect(() => {
    setDenuncias([]);
    setPage(0);
    setTotalPages(1);
    carregar(true, abaAtiva);
  }, [abaAtiva]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setTotalPages(1);
    await carregar(true, abaAtiva);
    setRefreshing(false);
  };

  const handleArquivar = (d: DenunciaResponse) => {
    Alert.alert('Arquivar denúncia', 'Marcar como improcedente e arquivar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Arquivar',
        onPress: async () => {
          setActionLoading(true);
          try {
            await adminService.revisarDenuncia(d.id, 'ARQUIVADA');
            setDenuncias(prev => prev.filter(x => x.id !== d.id));
          } catch {
            Alert.alert('Erro', 'Não foi possível arquivar a denúncia.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSuspender = async () => {
    if (!revisando) return;
    setActionLoading(true);
    try {
      await adminService.revisarDenuncia(revisando.id, 'SUSPENSAO_APLICADA', notaAdmin.trim() || undefined);
      setDenuncias(prev => prev.filter(x => x.id !== revisando.id));
      setRevisando(null);
      setNotaAdmin('');
    } catch {
      Alert.alert('Erro', 'Não foi possível aplicar a suspensão.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DenunciaResponse }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.motivoBadge}>
          <Text style={styles.motivoText}>
            {MOTIVOS_DENUNCIA_LABEL[item.motivo] ?? item.motivo}
          </Text>
        </View>
        <Text style={styles.data}>
          {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      <View style={styles.ids}>
        <View style={styles.idRow}>
          <Ionicons name="person-circle-outline" size={14} color={Colors.TextMuted} />
          <Text style={styles.idLabel}>Denunciante:</Text>
          <Text style={styles.idValue}>
            {item.nomeDenunciante ?? `#${item.denuncianteId}`}
          </Text>
        </View>
        <View style={styles.idRow}>
          <Ionicons name="warning-outline" size={14} color={Colors.Error} />
          <Text style={styles.idLabel}>Denunciado:</Text>
          <TouchableOpacity onPress={() => router.push(`/(admin)/participante/${item.denunciadoId}` as any)}>
            <Text style={[styles.idValue, styles.idLink]}>
              {item.nomeDenunciado ?? `#${item.denunciadoId}`}
            </Text>
          </TouchableOpacity>
        </View>
        {item.caronaId && (
          <View style={styles.idRow}>
            <Ionicons name="car-outline" size={14} color={Colors.TextMuted} />
            <Text style={styles.idLabel}>Carona:</Text>
            <Text style={styles.idValue}>#{item.caronaId}</Text>
          </View>
        )}
      </View>

      {item.descricao ? (
        <Text style={styles.descricao} numberOfLines={3}>{item.descricao}</Text>
      ) : null}

      {item.notaAdmin ? (
        <View style={styles.notaBox}>
          <Text style={styles.notaLabel}>Nota admin:</Text>
          <Text style={styles.notaTexto}>{item.notaAdmin}</Text>
        </View>
      ) : null}

      {abaAtiva === 'PENDENTE' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnArquivar]}
            onPress={() => handleArquivar(item)}
            disabled={actionLoading}
          >
            <Ionicons name="archive-outline" size={15} color={Colors.TextMuted} />
            <Text style={[styles.btnText, { color: Colors.TextMuted }]}>Arquivar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSuspender]}
            onPress={() => setRevisando(item)}
            disabled={actionLoading}
          >
            <Ionicons name="ban-outline" size={15} color="#fff" />
            <Text style={styles.btnText}>Suspender</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Denúncias</Text>
      </View>

      <View style={styles.abas}>
        {ABAS.map(aba => (
          <TouchableOpacity
            key={aba.value}
            style={[styles.aba, abaAtiva === aba.value && styles.abaAtiva]}
            onPress={() => setAbaAtiva(aba.value)}
          >
            <Text style={[styles.abaText, abaAtiva === aba.value && styles.abaTextAtiva]}>
              {aba.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.Primary} />
      ) : (
        <FlatList
          data={denuncias}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={denuncias.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.Primary]} />}
          onEndReached={() => carregar()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.Primary} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={56} color={Colors.Primary} />
              <Text style={styles.emptyTitulo}>Nenhuma denúncia</Text>
              <Text style={styles.emptyTexto}>
                {abaAtiva === 'PENDENTE'
                  ? 'Não há denúncias aguardando revisão.'
                  : 'Nenhum registro nesta categoria.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={!!revisando} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Suspender usuário</Text>
            <Text style={styles.modalSubtitulo}>
              Isso suspenderá o usuário #{revisando?.denunciadoId} e marcará a denúncia como resolvida.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nota interna (opcional)"
              value={notaAdmin}
              onChangeText={setNotaAdmin}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancelar]}
                onPress={() => { setRevisando(null); setNotaAdmin(''); }}
                disabled={actionLoading}
              >
                <Text style={[styles.btnText, { color: Colors.TextMuted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSuspender]}
                onPress={handleSuspender}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnText}>Suspender</Text>}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.Surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titulo: { fontSize: 20, fontWeight: '700', color: Colors.Text },
  abas: {
    flexDirection: 'row',
    backgroundColor: Colors.Surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  aba: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  abaAtiva: { borderBottomColor: Colors.Primary },
  abaText: { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },
  abaTextAtiva: { color: Colors.Primary, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  motivoBadge: {
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  motivoText: { fontSize: 12, fontWeight: '600', color: Colors.Primary },
  data: { fontSize: 12, color: Colors.TextMuted },
  ids: { gap: 4 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idLabel: { fontSize: 13, color: Colors.TextMuted },
  idValue: { fontSize: 13, fontWeight: '600', color: Colors.Text },
  idLink:  { color: Colors.Primary, textDecorationLine: 'underline' },
  descricao: {
    fontSize: 13,
    color: Colors.TextMuted,
    fontStyle: 'italic',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
  },
  notaBox: {
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  notaLabel: { fontSize: 11, fontWeight: '700', color: Colors.TextMuted, textTransform: 'uppercase' },
  notaTexto: { fontSize: 13, color: Colors.Text },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnArquivar: { backgroundColor: '#F0F0F0' },
  btnSuspender: { backgroundColor: Colors.Error },
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
  modalSubtitulo: { fontSize: 14, color: Colors.TextMuted, lineHeight: 20 },
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
