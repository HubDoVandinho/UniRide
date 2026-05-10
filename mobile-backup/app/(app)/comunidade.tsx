import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { amizadeService } from '@/services/amizade.service';
import { useNotificationStore } from '@/stores/notification.store';
import { AmizadeResponse, PerfilPublicoResponse, StatusRelacaoAmizade } from '@/types/api.types';

const POLL_MS = 10_000;

// ── Card de resultado de busca ────────────────────────────────────────────────

function ResultadoCard({
  item,
  onAdicionar,
  onAceitar,
  onRecusar,
  onRemover,
}: {
  item: PerfilPublicoResponse;
  onAdicionar: (id: number) => void;
  onAceitar: (amizadeId: number) => void;
  onRecusar: (amizadeId: number) => void;
  onRemover: (amizadeId: number) => void;
}) {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const status: StatusRelacaoAmizade = item.statusAmizade ?? 'NENHUMA';
  const inicial = item.nome.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardPerfil}
        onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: item.id, nome: item.nome } })}
      >
        <View style={styles.avatar}>
          {item.fotoPerfil
            ? <Image source={{ uri: item.fotoPerfil }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{inicial}</Text>}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardNome} numberOfLines={1}>{item.nome}</Text>
          {item.username && (
            <Text style={styles.cardUsername}>@{item.username}</Text>
          )}
          <Text style={styles.cardSub}>
            {item.tipo === 'MOTORISTA' ? 'Motorista' : 'Passageiro'}
            {item.avaliacaoMedia ? `  ★ ${item.avaliacaoMedia.toFixed(1)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardAcoes}>
        {status === 'NENHUMA' && (
          <TouchableOpacity style={styles.btnAdicionar} onPress={() => onAdicionar(item.id)}>
            <Text style={styles.btnAdicionarText}>+ Adicionar</Text>
          </TouchableOpacity>
        )}
        {status === 'PENDENTE_ENVIADA' && (
          <View style={styles.badgePendente}>
            <Text style={styles.badgePendenteText}>Aguardando</Text>
          </View>
        )}
        {status === 'PENDENTE_RECEBIDA' && (
          <View style={styles.acoesDuplas}>
            <TouchableOpacity
              style={styles.btnAceitar}
              onPress={() => item.amizadeId && onAceitar(item.amizadeId)}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnRecusar}
              onPress={() => item.amizadeId && onRecusar(item.amizadeId)}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {status === 'ACEITA' && (
          <TouchableOpacity
            style={styles.badgeAmigo}
            onPress={() =>
              showAlert('Remover amigo', `Remover ${item.nome} da sua lista?`, [
                { text: 'Cancelar', style: 'cancel', onPress: () => {} },
                {
                  text: 'Remover',
                  style: 'destructive',
                  onPress: () => item.amizadeId && onRemover(item.amizadeId),
                },
              ])
            }
          >
            <Text style={styles.badgeAmigoText}>Amigos</Text>
          </TouchableOpacity>
        )}
      </View>
      {alertModal}
    </View>
  );
}

// ── Card de solicitação recebida ──────────────────────────────────────────────

function RecebidaCard({
  item,
  onAceitar,
  onRecusar,
}: {
  item: AmizadeResponse;
  onAceitar: (id: number) => void;
  onRecusar: (id: number) => void;
}) {
  const router = useRouter();
  const outro = item.solicitante;
  const inicial = outro.nome.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardPerfil}
        onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: outro.id, nome: outro.nome } })}
      >
        <View style={styles.avatar}>
          {outro.fotoPerfil
            ? <Image source={{ uri: outro.fotoPerfil }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{inicial}</Text>}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardNome} numberOfLines={1}>{outro.nome}</Text>
          <Text style={styles.cardSub}>
            {outro.tipo === 'MOTORISTA' ? 'Motorista' : 'Passageiro'}
            {outro.avaliacaoMedia ? `  ★ ${outro.avaliacaoMedia.toFixed(1)}` : ''}
          </Text>
          <Text style={styles.cardSubMuted}>Toque para ver perfil</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.acoesDuplas}>
        <TouchableOpacity style={styles.btnAceitar} onPress={() => onAceitar(item.id)}>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnRecusar} onPress={() => onRecusar(item.id)}>
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Card de solicitação enviada ───────────────────────────────────────────────

function EnviadaCard({ item }: { item: AmizadeResponse }) {
  const router = useRouter();
  const outro = item.destinatario;
  const inicial = outro.nome.charAt(0).toUpperCase();

  const statusLabel =
    item.status === 'PENDENTE'  ? { texto: 'Aguardando', cor: Colors.TextMuted } :
    item.status === 'ACEITA'    ? { texto: 'Aceita',      cor: '#4CAF50'        } :
    item.status === 'RECUSADA'  ? { texto: 'Recusada',    cor: '#e53935'        } :
                                  { texto: item.status,   cor: Colors.TextMuted };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardPerfil}
        onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: outro.id, nome: outro.nome } })}
      >
        <View style={styles.avatar}>
          {outro.fotoPerfil
            ? <Image source={{ uri: outro.fotoPerfil }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{inicial}</Text>}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardNome} numberOfLines={1}>{outro.nome}</Text>
          <Text style={styles.cardSub}>
            {outro.tipo === 'MOTORISTA' ? 'Motorista' : 'Passageiro'}
            {outro.avaliacaoMedia ? `  ★ ${outro.avaliacaoMedia.toFixed(1)}` : ''}
          </Text>
          <Text style={styles.cardSubMuted}>Toque para ver perfil</Text>
        </View>
      </TouchableOpacity>
      <View style={[styles.badgeStatus, { borderColor: statusLabel.cor }]}>
        <Text style={[styles.badgeStatusText, { color: statusLabel.cor }]}>
          {statusLabel.texto}
        </Text>
      </View>
    </View>
  );
}

// ── Aba Buscar ────────────────────────────────────────────────────────────────

function AbaBuscar({ onEnviou }: { onEnviou: () => void }) {
  const { showAlert, alertModal } = useAppAlert();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<PerfilPublicoResponse[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    setTermo('');
    setResultados([]);
  }, []));

  const handleTermo = useCallback((texto: string) => {
    setTermo(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (texto.trim().length < 2) { setResultados([]); return; }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const data = await amizadeService.buscar(texto.trim());
        setResultados(data);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 400);
  }, []);

  const atualizarStatus = (id: number, status: StatusRelacaoAmizade, amizadeId?: number) => {
    setResultados((prev) =>
      prev.map((r) => r.id === id ? { ...r, statusAmizade: status, amizadeId: amizadeId ?? r.amizadeId } : r)
    );
  };

  const handleAdicionar = async (destinatarioId: number) => {
    try {
      await amizadeService.enviar(destinatarioId);
      setResultados((prev) => prev.filter((r) => r.id !== destinatarioId));
      onEnviou();
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar solicitação.');
    }
  };

  const handleAceitar = async (amizadeId: number, participanteId: number) => {
    try {
      await amizadeService.aceitar(amizadeId);
      atualizarStatus(participanteId, 'ACEITA', amizadeId);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível aceitar.');
    }
  };

  const handleRecusar = async (amizadeId: number, participanteId: number) => {
    try {
      await amizadeService.recusar(amizadeId);
      atualizarStatus(participanteId, 'NENHUMA');
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível recusar.');
    }
  };

  const handleRemover = async (amizadeId: number, participanteId: number) => {
    try {
      await amizadeService.remover(amizadeId);
      atualizarStatus(participanteId, 'NENHUMA');
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível remover.');
    }
  };

  return (
    <View style={styles.abaContainer}>
      {alertModal}
      <View style={styles.buscaContainer}>
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por nome ou @username..."
          placeholderTextColor={Colors.TextMuted}
          value={termo}
          onChangeText={handleTermo}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {buscando && <ActivityIndicator size="small" color={Colors.Primary} style={{ marginLeft: 8 }} />}
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          termo.trim().length >= 2 && !buscando ? (
            <Text style={styles.vazio}>Nenhum resultado para "{termo}"</Text>
          ) : termo.trim().length < 2 ? (
            <Text style={styles.vazio}>Digite ao menos 2 caracteres para buscar.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ResultadoCard
            item={item}
            onAdicionar={handleAdicionar}
            onAceitar={(aid) => handleAceitar(aid, item.id)}
            onRecusar={(aid) => handleRecusar(aid, item.id)}
            onRemover={(aid) => handleRemover(aid, item.id)}
          />
        )}
      />
    </View>
  );
}

// ── Aba Solicitações recebidas ────────────────────────────────────────────────

function AbaRecebidas({
  pendentes,
  loading,
  onRefresh,
  onAceitar,
  onRecusar,
}: {
  pendentes: AmizadeResponse[];
  loading: boolean;
  onRefresh: () => void;
  onAceitar: (id: number) => void;
  onRecusar: (id: number) => void;
}) {
  return (
    <FlatList
      data={pendentes}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.lista}
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        loading ? null : <Text style={styles.vazio}>Nenhuma solicitação recebida.</Text>
      }
      renderItem={({ item }) => (
        <RecebidaCard item={item} onAceitar={onAceitar} onRecusar={onRecusar} />
      )}
    />
  );
}

// ── Aba Solicitações enviadas ─────────────────────────────────────────────────

function AbaEnviadas({
  enviadas,
  loading,
  onRefresh,
}: {
  enviadas: AmizadeResponse[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <FlatList
      data={enviadas}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.lista}
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        loading ? null : <Text style={styles.vazio}>Nenhuma solicitação enviada.</Text>
      }
      renderItem={({ item }) => <EnviadaCard item={item} />}
    />
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

type AbaMain  = 'buscar' | 'solicitacoes';
type AbaSolic = 'recebidas' | 'enviadas';

export default function ComunidadeScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const { amizadesPendentes, marcarAmizadesVistas } = useNotificationStore();

  const [abaMain,  setAbaMain]  = useState<AbaMain>('buscar');
  const [abaSolic, setAbaSolic] = useState<AbaSolic>('recebidas');
  const [novaEnviada, setNovaEnviada] = useState(false);

  // Estado das listas — gerenciado aqui para o polling funcionar
  const [pendentes,        setPendentes]        = useState<AmizadeResponse[]>([]);
  const [enviadas,         setEnviadas]         = useState<AmizadeResponse[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(true);
  const [loadingEnviadas,  setLoadingEnviadas]  = useState(true);

  const carregarPendentes = useCallback(async (comLoader = true) => {
    if (comLoader) setLoadingPendentes(true);
    try { setPendentes(await amizadeService.listarPendentes()); } catch {}
    finally { setLoadingPendentes(false); }
  }, []);

  const carregarEnviadas = useCallback(async (comLoader = true) => {
    if (comLoader) setLoadingEnviadas(true);
    try { setEnviadas(await amizadeService.listarEnviadas()); } catch {}
    finally { setLoadingEnviadas(false); }
  }, []);

  // Carga inicial ao focar a tela
  useFocusEffect(useCallback(() => {
    carregarPendentes();
    carregarEnviadas();
  }, []));

  // Polling silencioso a cada 10s
  useEffect(() => {
    const id = setInterval(() => {
      carregarPendentes(false);
      carregarEnviadas(false);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [carregarPendentes, carregarEnviadas]);

  // Chamado por AbaBuscar após enviar solicitação com sucesso
  const handleEnviou = useCallback(() => {
    setAbaMain('solicitacoes');
    setAbaSolic('enviadas');
    setNovaEnviada(true);
    carregarEnviadas(false);
  }, [carregarEnviadas]);

  const handleAceitarRecebida = useCallback(async (amizadeId: number) => {
    try {
      await amizadeService.aceitar(amizadeId);
      setPendentes((prev) => prev.filter((p) => p.id !== amizadeId));
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível aceitar.');
    }
  }, [showAlert]);

  const handleRecusarRecebida = useCallback(async (amizadeId: number) => {
    try {
      await amizadeService.recusar(amizadeId);
      setPendentes((prev) => prev.filter((p) => p.id !== amizadeId));
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível recusar.');
    }
  }, [showAlert]);

  return (
    <SafeAreaView style={styles.safe}>
      {alertModal}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.titulo}>Comunidade</Text>
        <Text style={styles.subtitulo}>Encontre colegas da sua instituição</Text>
      </View>

      {/* Tabs principais */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, abaMain === 'buscar' && styles.tabItemAtivo]}
          onPress={() => setAbaMain('buscar')}
        >
          <Text style={[styles.tabText, abaMain === 'buscar' && styles.tabTextAtivo]}>
            Buscar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, abaMain === 'solicitacoes' && styles.tabItemAtivo]}
          onPress={() => { setAbaMain('solicitacoes'); marcarAmizadesVistas(); }}
        >
          <View style={styles.tabItemInner}>
            <Text style={[styles.tabText, abaMain === 'solicitacoes' && styles.tabTextAtivo]}>
              Solicitações
            </Text>
            {(amizadesPendentes > 0 || novaEnviada) && abaMain !== 'solicitacoes' && (
              <View style={styles.tabBadgeDot} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Conteúdo da aba principal */}
      {abaMain === 'buscar' ? (
        <AbaBuscar onEnviou={handleEnviou} />
      ) : (
        <View style={styles.flex}>
          {/* Sub-tabs de solicitações */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[styles.subTabItem, abaSolic === 'recebidas' && styles.subTabItemAtivo]}
              onPress={() => setAbaSolic('recebidas')}
            >
              <Text style={[styles.subTabText, abaSolic === 'recebidas' && styles.subTabTextAtivo]}>
                Recebidas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabItem, abaSolic === 'enviadas' && styles.subTabItemAtivo]}
              onPress={() => { setAbaSolic('enviadas'); setNovaEnviada(false); }}
            >
              <View style={styles.tabItemInner}>
                <Text style={[styles.subTabText, abaSolic === 'enviadas' && styles.subTabTextAtivo]}>
                  Enviadas
                </Text>
                {novaEnviada && abaSolic !== 'enviadas' && (
                  <View style={styles.tabBadgeDot} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {abaSolic === 'recebidas' ? (
            <AbaRecebidas
              pendentes={pendentes}
              loading={loadingPendentes}
              onRefresh={carregarPendentes}
              onAceitar={handleAceitarRecebida}
              onRecusar={handleRecusarRecebida}
            />
          ) : (
            <AbaEnviadas
              enviadas={enviadas}
              loading={loadingEnviadas}
              onRefresh={carregarEnviadas}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.SurfaceLight },
  flex:          { flex: 1 },
  header:        { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn:       { padding: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titulo:        { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitulo:     { fontSize: 13, color: Colors.TextMuted, marginTop: 2 },

  // Tabs principais
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.Surface,
    borderRadius: 12,
    padding: 4,
  },
  tabItem:       { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabItemAtivo:  { backgroundColor: Colors.Primary },
  tabItemInner:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText:       { fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  tabTextAtivo:  { color: '#fff' },
  tabBadgeDot:   { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF6B00', borderWidth: 1.5, borderColor: '#fff' },

  // Sub-tabs de solicitações
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

  // Busca
  abaContainer:   { flex: 1 },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.Surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(123,47,190,0.2)',
    paddingHorizontal: 14,
  },
  buscaInput: { flex: 1, height: 44, fontSize: 15, color: Colors.Text },

  // Lista
  lista:   { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  vazio:   { textAlign: 'center', color: Colors.TextMuted, marginTop: 40, fontSize: 14 },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 18 },
  avatarImg:     { width: 44, height: 44, borderRadius: 22 },
  cardPerfil:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo:      { flex: 1, marginRight: 8 },
  cardNome:      { fontSize: 15, fontWeight: '600', color: Colors.Text },
  cardUsername:  { fontSize: 12, color: Colors.Primary, marginTop: 1 },
  cardSub:       { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },
  cardSubMuted:  { fontSize: 11, color: Colors.TextMuted, marginTop: 2, fontStyle: 'italic' },
  cardAcoes:     { alignItems: 'flex-end' },

  btnAdicionar:     { backgroundColor: Colors.Primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  btnAdicionarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  badgePendente:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.TextMuted },
  badgePendenteText: { color: Colors.TextMuted, fontSize: 12 },

  acoesDuplas:    { flexDirection: 'row', gap: 8 },
  btnAceitar:     { backgroundColor: '#4CAF50', borderRadius: 20, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  btnAceitarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnRecusar:     { backgroundColor: '#e53935', borderRadius: 20, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  btnRecusarText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  badgeAmigo:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: '#4CAF50' },
  badgeAmigoText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },

  badgeStatus:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  badgeStatusText: { fontSize: 12, fontWeight: '600' },
});
