import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { CaronaResponse, SolicitacaoResponse, StatusSolicitacao } from '@/types/api.types';

// ── Constantes ───────────────────────────────────────────────────────────────

const TAGS_MOTORISTA = [
  'Pontual', 'Dirigiu bem', 'Comunicativo', 'Carro limpo',
  'Rota eficiente', 'Amigável', 'Seguro', 'Música boa',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_SOL_LABEL: Record<StatusSolicitacao, string> = {
  PENDENTE:  'Pendente',
  APROVADA:  'Aprovada',
  RECUSADA:  'Solicitação recusada',
  EMBARCADO: 'Embarcado',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_SOL_COLOR: Record<StatusSolicitacao, string> = {
  PENDENTE:  '#FF9800',
  APROVADA:  Colors.Success,
  RECUSADA:  Colors.Error,
  EMBARCADO: '#2196F3',
  CONCLUIDA: '#9E9E9E',
  CANCELADA: '#9E9E9E',
};

const STATUS_CARONA_LABEL: Record<string, string> = {
  AGENDADA:     'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA:    'Concluída',
  CANCELADA:    'Cancelada',
};

const STATUS_CARONA_COLOR: Record<string, string> = {
  AGENDADA:     '#FF9800',
  EM_ANDAMENTO: '#2196F3',
  CONCLUIDA:    '#9E9E9E',
  CANCELADA:    '#9E9E9E',
};

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }

function formatarData(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${diasSemana[d.getDay()]}, ${day} ${meses[month - 1]}`;
}

function Estrelas({ nota, onChange }: { nota: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.estrelasRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Ionicons
            name={n <= nota ? 'star' : 'star-outline'}
            size={36}
            color={n <= nota ? '#FFD700' : '#CCC'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Aba Oferecidas (motorista) ────────────────────────────────────────────────

function AbaOferecidas() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const { caronasComEmbarcados, marcarEmbarcadosVistos, caronasComMensagemNova } = useNotificationStore();
  const [caronas, setCaronas] = useState<CaronaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setCaronas(await caronaService.listarMinhasHistorico());
    } catch {
      showAlert('Erro', 'Não foi possível carregar suas caronas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSilencioso = useCallback(async () => {
    try { setCaronas(await caronaService.listarMinhasHistorico()); } catch { /* silent */ }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  useEffect(() => {
    intervalRef.current = setInterval(refreshSilencioso, 5_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        intervalRef.current = setInterval(refreshSilencioso, 5_000);
      } else {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    });
    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshSilencioso]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.Primary} size="large" />
      </View>
    );
  }

  if (caronas.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="car-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Nenhuma carona ainda</Text>
        <Text style={styles.emptySubtitle}>
          As caronas que você iniciar ou concluir aparecerão aqui.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={caronas}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      onRefresh={carregar}
      refreshing={loading}
      renderItem={({ item }) => {
        const iso = typeof item.data === 'string' ? item.data : String(item.data);
        const cor = STATUS_CARONA_COLOR[item.status] ?? '#9E9E9E';
        const titulo = item.nome ?? `${pontoRota(item.origem)} → ${pontoRota(item.destino)}`;
        const rota = item.origem && item.destino
          ? `${pontoRota(item.origem)} → ${pontoRota(item.destino)}`
          : null;
        const temEmbarcado = caronasComEmbarcados.includes(item.id);
        const temMensagem = caronasComMensagemNova.includes(item.id);
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (temEmbarcado) marcarEmbarcadosVistos(item.id);
              router.push({ pathname: '/caronas/[id]', params: { id: item.id } });
            }}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardNome} numberOfLines={1}>{titulo}</Text>
                {rota && (
                  <Text style={styles.cardSub} numberOfLines={1}>📍 {rota}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(temEmbarcado || temMensagem) && (
                  <View style={styles.embarcadoBadge} />
                )}
                <View style={[styles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
                  <Text style={[styles.statusText, { color: cor }]}>
                    {STATUS_CARONA_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color={Colors.TextMuted} />
              <Text style={styles.cardMetaText}>{formatarData(iso)} · {item.horarioSaida.slice(0, 5)}</Text>
              <Text style={styles.cardMetaDot}>·</Text>
              <Ionicons name="people-outline" size={13} color={Colors.TextMuted} />
              <Text style={styles.cardMetaText}>{item.vagasDisponiveis}/{item.vagasTotal} vagas</Text>
            </View>

            {(item.veiculoMarca || item.veiculoModelo || item.veiculoTipo) && (
              <View style={[styles.cardMeta, { marginTop: 2 }]}>
                <Ionicons name="car-outline" size={13} color={Colors.TextMuted} />
                <Text style={styles.cardMetaText}>
                  {[item.veiculoMarca, item.veiculoModelo, item.veiculoTipo].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}

          </TouchableOpacity>
        );
      }}
    />
  );
}

// ── Aba Solicitadas (passageiro) ──────────────────────────────────────────────

function AbaSolicitadas() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const { aprovacoesVistas, marcarAprovacaoVista, caronasComMensagemNova, negativosVistos, marcarNegativoVisto, marcarMensagemNova, ultimaMensagemVista } = useNotificationStore();
  const { user } = useAuthStore();
  const ultimaMensagemVistaRef = useRef<Record<number, number>>({});
  useEffect(() => { ultimaMensagemVistaRef.current = ultimaMensagemVista; }, [ultimaMensagemVista]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal avaliação
  const [modalAvaliar, setModalAvaliar] = useState(false);
  const [solicitacaoAvaliar, setSolicitacaoAvaliar] = useState<SolicitacaoResponse | null>(null);
  const [buscandoMotorista, setBuscandoMotorista] = useState(false);
  const [motoristaId, setMotoristaId] = useState<number | null>(null);
  const [notaAvaliar, setNotaAvaliar] = useState(0);
  const [comentarioAvaliar, setComentarioAvaliar] = useState('');
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setSolicitacoes(await caronaService.listarMinhasSolicitacoes());
    } catch {
      showAlert('Erro', 'Não foi possível carregar suas caronas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSilencioso = useCallback(async () => {
    try { setSolicitacoes(await caronaService.listarMinhasSolicitacoes()); } catch { /* silent */ }
  }, []);

  useFocusEffect(useCallback(() => {
    carregar();
  }, [carregar]));

  useFocusEffect(useCallback(() => {
    if (!user || solicitacoes.length === 0) return;
    const ativas = solicitacoes.filter((s) => s.status === 'APROVADA' || s.status === 'EMBARCADO');
    ativas.forEach(async (s) => {
      try {
        const msgs = await caronaService.listarMensagens(s.caronaId);
        if (msgs.length === 0) return;
        const ultimaVista = ultimaMensagemVistaRef.current[s.caronaId] ?? 0;
        const temNova = msgs.some((m) => m.tipo !== 'PIX_KEY' && m.remetenteId !== user.id && m.id > ultimaVista);
        if (temNova) marcarMensagemNova(s.caronaId);
      } catch {}
    });
  }, [solicitacoes, user, marcarMensagemNova]));

  useEffect(() => {
    intervalRef.current = setInterval(refreshSilencioso, 5_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        intervalRef.current = setInterval(refreshSilencioso, 5_000);
      } else {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    });
    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshSilencioso]);


  const handleEmbarcar = async (id: number) => {
    setAtualizando(id);
    try {
      await caronaService.embarcarPassageiro(id);
      // Refresh silencioso — garante que o card continue visível com status correto
      const todas = await caronaService.listarMinhasSolicitacoes();
      setSolicitacoes(todas);
    } catch (error: unknown) {
      showAlert('Erro', error instanceof Error ? error.message : 'Erro ao confirmar embarque.');
    } finally {
      setAtualizando(null);
    }
  };

  const abrirModalAvaliar = async (solicitacao: SolicitacaoResponse) => {
    setSolicitacaoAvaliar(solicitacao);
    setNotaAvaliar(0);
    setComentarioAvaliar('');
    setTagsSelecionadas([]);
    setMotoristaId(null);
    setBuscandoMotorista(true);
    setModalAvaliar(true);
    try {
      const carona = await caronaService.buscarPorId(solicitacao.caronaId);
      setMotoristaId(carona.motoristaId);
    } catch {
      showAlert('Erro', 'Não foi possível carregar os dados da carona.');
      setModalAvaliar(false);
    } finally {
      setBuscandoMotorista(false);
    }
  };

  const enviarAvaliacao = async () => {
    if (!solicitacaoAvaliar || !motoristaId) return;
    if (notaAvaliar === 0) {
      showAlert('Atenção', 'Selecione uma nota antes de enviar.');
      return;
    }
    setEnviandoAvaliacao(true);
    try {
      await caronaService.avaliar({
        avaliadoId: motoristaId,
        caronaId: solicitacaoAvaliar.caronaId,
        nota: notaAvaliar,
        comentario: comentarioAvaliar.trim() || undefined,
        tags: tagsSelecionadas.length > 0 ? tagsSelecionadas : undefined,
      });
      setModalAvaliar(false);
      showAlert('Obrigado!', 'Sua avaliação foi enviada com sucesso.');
      await carregar();
    } catch (error: unknown) {
      showAlert('Erro', error instanceof Error ? error.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const renderItem = ({ item, index }: { item: SolicitacaoResponse; index: number }) => {
    const cor = STATUS_SOL_COLOR[item.status];
    const concluida = item.status === 'CONCLUIDA';
    const jaAvaliou = item.jaAvaliouMotorista === true;
    const nomeCarona = item.nomeCarona ?? (item.direcao === 'IDA' ? 'Ida' : item.direcao === 'VOLTA' ? 'Volta' : 'Carona');
    const endereco = item.enderecoDestino
      ? item.enderecoDestino.split(',').slice(0, 2).join(',').trim()
      : null;
    const temAprovacaoNova = item.status === 'APROVADA' && !aprovacoesVistas.includes(item.id);
    const temMensagem = caronasComMensagemNova.includes(item.caronaId);
    const temNegativoNovo = (item.status === 'RECUSADA' || item.status === 'CANCELADA') && !negativosVistos.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (temAprovacaoNova) marcarAprovacaoVista(item.id);
          if (temNegativoNovo) marcarNegativoVisto(item.id);
          router.push({ pathname: '/caronas/[id]', params: { id: item.caronaId } });
        }}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNome}>{nomeCarona}</Text>
            {endereco && (
              <Text style={styles.cardSub} numberOfLines={1}>📍 {endereco}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(temNegativoNovo || temAprovacaoNova || temMensagem) && <View style={styles.embarcadoBadge} />}
            {item.status !== 'PENDENTE' && (
              <View style={[styles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
                <Text style={[styles.statusText, { color: cor }]}>{STATUS_SOL_LABEL[item.status]}</Text>
              </View>
            )}
          </View>
        </View>

        {item.mensagem && (
          <Text style={styles.cardMensagem}>"{item.mensagem}"</Text>
        )}

        {(item.dataCarona || item.vagasTotal) && (
          <View style={styles.cardMeta}>
            {item.dataCarona && (
              <>
                <Ionicons name="calendar-outline" size={13} color={Colors.TextMuted} />
                <Text style={styles.cardMetaText}>
                  {formatarData(item.dataCarona)}
                  {item.horarioSaida ? ` · ${item.horarioSaida.slice(0, 5)}` : ''}
                </Text>
              </>
            )}
            {item.dataCarona && item.vagasTotal && (
              <Text style={styles.cardMetaDot}>·</Text>
            )}
            {item.vagasTotal && (
              <>
                <Ionicons name="people-outline" size={13} color={Colors.TextMuted} />
                <Text style={styles.cardMetaText}>
                  {item.vagasDisponiveis}/{item.vagasTotal} vagas
                </Text>
              </>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          {concluida && !jaAvaliou && (
            <Button
              title="Avaliar motorista"
              onPress={() => abrirModalAvaliar(item)}
              variant="outline"
              style={styles.actionButton}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      ) : solicitacoes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma carona ainda</Text>
          <Text style={styles.emptySubtitle}>
            Solicite uma vaga nas caronas disponíveis e elas aparecerão aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={(() => {
            const ativas   = solicitacoes.filter((s) => ['PENDENTE', 'APROVADA', 'EMBARCADO'].includes(s.status));
            const historico = solicitacoes.filter((s) => ['CONCLUIDA', 'CANCELADA', 'RECUSADA'].includes(s.status));
            return [
              ...(ativas.length > 0 ? [{ tipo: 'header', titulo: 'Ativas' } as any] : []),
              ...ativas,
              ...(historico.length > 0 ? [{ tipo: 'header', titulo: 'Histórico' } as any] : []),
              ...historico,
            ];
          })()}
          keyExtractor={(item, idx) => item.tipo === 'header' ? `h-${idx}` : item.id.toString()}
          renderItem={({ item }) => {
            if (item.tipo === 'header') {
              return <Text style={styles.secaoHeader}>{item.titulo}</Text>;
            }
            return renderItem({ item, index: 0 });
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={carregar}
          refreshing={loading}
        />
      )}

      {/* Modal de avaliação */}
      <Modal
        visible={modalAvaliar}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAvaliar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>Avaliar motorista</Text>
            <Text style={styles.modalSubtitulo}>Sua avaliação é anônima e ajuda a comunidade.</Text>

            {buscandoMotorista ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={Colors.Primary} />
                <Text style={styles.modalLoadingText}>Carregando...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.notaLabel}>Nota</Text>
                <Estrelas nota={notaAvaliar} onChange={setNotaAvaliar} />

                <Text style={styles.tagsLabel}>O que destacou? (opcional)</Text>
                <View style={styles.tagsWrap}>
                  {TAGS_MOTORISTA.map((tag) => {
                    const selecionada = tagsSelecionadas.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagChip, selecionada && styles.tagChipAtivo]}
                        onPress={() =>
                          setTagsSelecionadas((prev) =>
                            selecionada ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                      >
                        <Text style={[styles.tagChipText, selecionada && styles.tagChipTextAtivo]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.comentarioLabel}>Comentário (opcional)</Text>
                <TextInput
                  style={styles.comentarioInput}
                  placeholder="Como foi a experiência?"
                  placeholderTextColor="#999"
                  value={comentarioAvaliar}
                  onChangeText={setComentarioAvaliar}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                />

                <View style={styles.modalRodape}>
                  <TouchableOpacity onPress={() => setModalAvaliar(false)} style={styles.cancelarBtn}>
                    <Text style={styles.cancelarBtnText}>Agora não</Text>
                  </TouchableOpacity>
                  <Button
                    title="Enviar avaliação"
                    onPress={enviarAvaliacao}
                    variant="primary"
                    loading={enviandoAvaliacao}
                    disabled={notaAvaliar === 0}
                    style={styles.enviarBtn}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      {alertModal}
    </>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

type Aba = 'oferecidas' | 'solicitadas';

export default function MinhasCaronasScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isMotorista = user?.tipo === 'MOTORISTA';
  const [aba, setAba] = useState<Aba>('oferecidas');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Minhas caronas</Text>
        <Text style={styles.subtitle}>
          {isMotorista
            ? 'Caronas que você ofereceu e solicitou.'
            : 'Gerencie as caronas que você solicitou.'}
        </Text>
      </View>

      {isMotorista && (
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabItem, aba === 'oferecidas' && styles.subTabItemAtivo]}
            onPress={() => setAba('oferecidas')}
          >
            <Text style={[styles.subTabText, aba === 'oferecidas' && styles.subTabTextAtivo]}>
              Oferecidas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabItem, aba === 'solicitadas' && styles.subTabItemAtivo]}
            onPress={() => setAba('solicitadas')}
          >
            <Text style={[styles.subTabText, aba === 'solicitadas' && styles.subTabTextAtivo]}>
              Solicitadas
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {isMotorista
          ? (aba === 'oferecidas' ? <AbaOferecidas /> : <AbaSolicitadas />)
          : <AbaSolicitadas />
        }
      </View>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.SurfaceLight },
  header:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn:    { padding: 4 },
  headerText: { flex: 1 },
  title:      { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 2 },
  subtitle:   { fontSize: 13, color: Colors.TextMuted },
  content:   { flex: 1 },

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

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: Colors.TextMuted, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.TextMuted, textAlign: 'center' },
  list:        { gap: 12, padding: 20 },
  secaoHeader: { fontSize: 12, fontWeight: '700', color: Colors.Primary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, marginBottom: -4 },

  card: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardNome:    { fontSize: 14, fontWeight: '700', color: Colors.Text },
  cardSub:     { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cardMetaText:{ fontSize: 12, color: Colors.TextMuted },
  cardMetaDot: { fontSize: 12, color: Colors.TextMuted, marginHorizontal: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  cardMensagem:{ fontSize: 13, color: Colors.Text, fontStyle: 'italic', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionButton:{ flex: 1, paddingVertical: 10, minHeight: 40 },
  embarcadoBadge: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF6B00',
    borderWidth: 1.5, borderColor: '#fff',
  },
  avaliadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10 },
  avaliadoText:{ fontSize: 13, color: Colors.Success, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.Surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  modalTitulo:      { fontSize: 20, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  modalSubtitulo:   { fontSize: 13, color: Colors.TextMuted, marginBottom: 20, lineHeight: 19 },
  modalLoading:     { alignItems: 'center', paddingVertical: 32, gap: 12 },
  modalLoadingText: { color: Colors.TextMuted, fontSize: 14 },
  notaLabel:        { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 12 },
  estrelasRow:      { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tagsLabel: { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 8, marginTop: 16 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tagChip: {
    borderWidth: 1.5, borderColor: '#DDD', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.SurfaceLight,
  },
  tagChipAtivo: { borderColor: Colors.Primary, backgroundColor: Colors.Primary + '18' },
  tagChipText: { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },
  tagChipTextAtivo: { color: Colors.Primary, fontWeight: '700' },
  comentarioLabel:  { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 8, marginTop: 16 },
  comentarioInput: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E0E0E0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.Text, minHeight: 80, marginBottom: 8,
  },
  modalRodape:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  cancelarBtn:  { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD' },
  cancelarBtnText: { fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  enviarBtn:    { flex: 1, minHeight: 46 },
});
