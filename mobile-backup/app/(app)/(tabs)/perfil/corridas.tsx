import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { rotinaService } from '@/services/rotina.service';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { DiaSemana, RotinaResponse, CaronaResponse, SolicitacaoResponse, StatusSolicitacao } from '@/types/api.types';

// ── Constantes ────────────────────────────────────────────────────────────────

const DIA_LABEL: Record<string, string> = {
  SEG: 'Seg', TER: 'Ter', QUA: 'Qua', QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom',
};

const DIA_TO_DOW: Record<DiaSemana, number> = {
  DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6,
};

const DIA_ORDER: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const STATUS_LABEL: Record<string, string> = {
  ATIVA: 'Ativa', ENCERRADA: 'Encerrada',
};

// ── Helpers de calendário ─────────────────────────────────────────────────────

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minDate(): string {
  return dateToISO(new Date());
}

function maxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return dateToISO(d);
}

function buildDisabledDates(diasSemana: DiaSemana[]) {
  const dows = new Set(diasSemana.map((d) => DIA_TO_DOW[d]));
  const result: Record<string, { disabled: boolean; disableTouchEvent: boolean }> = {};
  const base = new Date();
  for (let i = 0; i <= 60; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (!dows.has(d.getDay())) {
      result[dateToISO(d)] = { disabled: true, disableTouchEvent: true };
    }
  }
  return result;
}

type MarkedDates = Record<string, {
  selected?: boolean;
  selectedColor?: string;
  marked?: boolean;
  dotColor?: string;
  disabled?: boolean;
  disableTouchEvent?: boolean;
}>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOL_LABEL: Record<StatusSolicitacao, string> = {
  PENDENTE: 'Pendente', APROVADA: 'Aprovada', RECUSADA: 'Vaga recusada',
  EMBARCADO: 'Embarcado', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
};

const SOL_COLOR: Record<StatusSolicitacao, string> = {
  PENDENTE: '#FF9800', APROVADA: Colors.Success, RECUSADA: Colors.Error,
  EMBARCADO: '#2196F3', CONCLUIDA: '#9E9E9E', CANCELADA: '#9E9E9E',
};

function formatarData(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Estrelas ──────────────────────────────────────────────────────────────────

function Estrelas({ nota, onChange }: { nota: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Ionicons name={n <= nota ? 'star' : 'star-outline'} size={36}
            color={n <= nota ? '#FFD700' : '#CCC'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Tela passageiro ───────────────────────────────────────────────────────────

interface SolicitacaoComCarona {
  sol: SolicitacaoResponse;
  carona?: CaronaResponse;
}

function PassageiroCorridasScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const { user } = useAuthStore();
  const {
    caronasIniciadasVistas, marcarCaronaIniciadaVista,
    caronasComMensagemNova, marcarMensagemNova,
    aprovacoesVistas, marcarAprovacaoVista,
  } = useNotificationStore();
  const [itens, setItens]           = useState<SolicitacaoComCarona[]>([]);
  const [loading, setLoading]       = useState(true);
  const [atualizando, setAtualizando] = useState<number | null>(null);

  // Avaliação
  const [modalAvaliar, setModalAvaliar]             = useState(false);
  const [solAvaliar, setSolAvaliar]                 = useState<SolicitacaoResponse | null>(null);
  const [motoristaId, setMotoristaId]               = useState<number | null>(null);
  const [buscandoMot, setBuscandoMot]               = useState(false);
  const [nota, setNota]                             = useState(0);
  const [comentario, setComentario]                 = useState('');
  const [enviandoAv, setEnviandoAv]                 = useState(false);

  const verificarMensagens = useCallback(async (lista: SolicitacaoComCarona[]) => {
    const { ultimaMensagemVista } = useNotificationStore.getState();
    const ativas = lista.filter((i) => ['APROVADA', 'EMBARCADO'].includes(i.sol.status));
    for (const { sol } of ativas) {
      try {
        const msgs = await caronaService.listarMensagens(sol.caronaId);
        const ultimaVista = ultimaMensagemVista[sol.caronaId] ?? 0;
        const temNova = msgs.some(
          (m) => m.tipo !== 'PIX_KEY' && m.remetenteId !== user?.id && m.id > ultimaVista
        );
        if (temNova) marcarMensagemNova(sol.caronaId);
      } catch { /* silent */ }
    }
  }, [user, marcarMensagemNova]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const solis = await caronaService.listarMinhasSolicitacoes();
      const ids = [...new Set(solis.map((s) => s.caronaId))];
      const caronas = await Promise.all(
        ids.map((id) => caronaService.buscarPorId(id).catch(() => null))
      );
      const mapaCarona: Record<number, CaronaResponse> = {};
      caronas.forEach((c) => { if (c) mapaCarona[c.id] = c; });
      const novaLista = solis.map((sol) => ({ sol, carona: mapaCarona[sol.caronaId] }));
      setItens(novaLista);
      verificarMensagens(novaLista);
    } catch {
      showAlert('Erro', 'Não foi possível carregar suas corridas.');
    } finally {
      setLoading(false);
    }
  }, [verificarMensagens]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const handleEmbarcar = async (solId: number) => {
    setAtualizando(solId);
    try {
      const atualizada = await caronaService.embarcarPassageiro(solId);
      setItens((prev) => prev.map((i) => i.sol.id === solId ? { ...i, sol: atualizada } : i));
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Erro ao confirmar embarque.');
    } finally { setAtualizando(null); }
  };

  const handleCancelar = (solId: number) => {
    showAlert('Cancelar solicitação', 'Deseja cancelar esta solicitação?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Cancelar solicitação', style: 'destructive',
        onPress: async () => {
          setAtualizando(solId);
          try {
            await caronaService.cancelarSolicitacao(solId);
            setItens((prev) =>
              prev.map((i) => i.sol.id === solId ? { ...i, sol: { ...i.sol, status: 'CANCELADA' as const } } : i)
            );
          } catch { showAlert('Erro', 'Não foi possível cancelar.'); }
          finally { setAtualizando(null); }
        },
      },
    ]);
  };

  const abrirAvaliar = async (sol: SolicitacaoResponse) => {
    setSolAvaliar(sol); setNota(0); setComentario('');
    setMotoristaId(null); setBuscandoMot(true); setModalAvaliar(true);
    try {
      const c = await caronaService.buscarPorId(sol.caronaId);
      setMotoristaId(c.motoristaId);
    } catch { showAlert('Erro', 'Não foi possível carregar a carona.'); setModalAvaliar(false); }
    finally { setBuscandoMot(false); }
  };

  const enviarAvaliacao = async () => {
    if (!solAvaliar || !motoristaId) return;
    if (nota === 0) { showAlert('Atenção', 'Selecione uma nota.'); return; }
    setEnviandoAv(true);
    try {
      await caronaService.avaliar({
        avaliadoId: motoristaId, caronaId: solAvaliar.caronaId,
        nota, comentario: comentario.trim() || undefined,
      });
      setItens((prev) => prev.map((i) => i.sol.id === solAvaliar!.id ? { ...i, sol: { ...i.sol, jaAvaliouMotorista: true } } : i));
      setModalAvaliar(false);
      showAlert('Obrigado!', 'Avaliação enviada com sucesso.');
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar a avaliação.');
    } finally { setEnviandoAv(false); }
  };

  const ativas = itens
    .filter((i) => ['PENDENTE', 'APROVADA', 'EMBARCADO'].includes(i.sol.status))
    .sort((a, b) => (a.carona?.status === 'EM_ANDAMENTO' ? 0 : 1) - (b.carona?.status === 'EM_ANDAMENTO' ? 0 : 1));
  const historico = itens
    .filter((i) => ['CONCLUIDA', 'CANCELADA', 'RECUSADA'].includes(i.sol.status))
    .sort((a, b) => ((b.carona?.data as string) ?? '').localeCompare((a.carona?.data as string) ?? ''));

  const renderItem = ({ item: { sol, carona } }: { item: SolicitacaoComCarona }) => {
    const cor = SOL_COLOR[sol.status];
    const podeCancelar = sol.status === 'PENDENTE' || sol.status === 'APROVADA';
    const podeEmbarcar = sol.status === 'APROVADA';
    const podeConcluida = sol.status === 'CONCLUIDA';
    const jaAvaliou = sol.jaAvaliouMotorista === true;
    const caronaIniciada =
      carona?.status === 'EM_ANDAMENTO' &&
      (sol.status === 'APROVADA' || sol.status === 'EMBARCADO') &&
      !caronasIniciadasVistas.includes(sol.caronaId);
    const temAprovacaoNova = sol.status === 'APROVADA' && !aprovacoesVistas.includes(sol.id);
    const temAcoes = podeEmbarcar || podeConcluida;

    return (
      <View style={passStyles.cardWrap}>
        {(caronaIniciada || caronasComMensagemNova.includes(sol.caronaId) || temAprovacaoNova) && (
          <View style={passStyles.iniciaDot} />
        )}
        <TouchableOpacity
          style={passStyles.card}
          activeOpacity={0.97}
          onPress={() => {
            marcarCaronaIniciadaVista(sol.caronaId);
            if (temAprovacaoNova) marcarAprovacaoVista(sol.id);
            router.push(`/caronas/${sol.caronaId}` as any);
          }}
        >

        <View style={passStyles.cardHeader}>
          <View style={passStyles.cardIconWrap}>
            <Ionicons name="car-outline" size={24} color={Colors.Primary} />
          </View>
          <View style={{ flex: 1 }}>
            {carona?.nome
              ? <Text style={passStyles.cardNome}>{carona.nome}</Text>
              : <Text style={passStyles.cardNome}>
                  {carona ? `${pontoRota(carona.origem)} → ${pontoRota(carona.destino)}` : `Carona #${sol.caronaId}`}
                </Text>
            }
            {carona && (
              <View style={passStyles.cardInfo}>
                <Ionicons name="calendar-outline" size={11} color={Colors.TextMuted} />
                <Text style={passStyles.cardInfoText}>{formatarData(carona.data)}</Text>
                <Text style={passStyles.cardInfoSep}>·</Text>
                <Ionicons name="time-outline" size={11} color={Colors.TextMuted} />
                <Text style={passStyles.cardInfoText}>{carona.horarioSaida.slice(0, 5)}</Text>
              </View>
            )}
          </View>
          <View style={passStyles.headerRight}>
            <View style={[passStyles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
              <Text style={[passStyles.statusText, { color: cor }]}>{SOL_LABEL[sol.status]}</Text>
            </View>
            {podeCancelar && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); handleCancelar(sol.id); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={passStyles.kebabBtn}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={Colors.TextMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {sol.enderecoDestino && (
          <>
            <View style={passStyles.cardDivider} />
            <View style={passStyles.destRow}>
              <Ionicons name="location-outline" size={14} color={Colors.Primary} />
              <Text style={passStyles.destText} numberOfLines={1}>{sol.enderecoDestino}</Text>
            </View>
          </>
        )}

        {temAcoes && (
          <>
            <View style={passStyles.cardDivider} />
            <View style={passStyles.cardActions}>
              {podeEmbarcar && (
                <Button title="Confirmar embarque" onPress={() => handleEmbarcar(sol.id)}
                  variant="primary" loading={atualizando === sol.id} style={passStyles.actionBtn} />
              )}
              {podeConcluida && !jaAvaliou && (
                <Button title="Avaliar motorista" onPress={() => abrirAvaliar(sol)}
                  variant="outline" style={passStyles.actionBtn} />
              )}
              {podeConcluida && jaAvaliou && (
                <View style={passStyles.avaliadoBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.Success} />
                  <Text style={passStyles.avaliadoText}>Avaliação enviada</Text>
                </View>
              )}
            </View>
          </>
        )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1, padding: 20 }}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Minhas Caronas</Text>
          <Text style={styles.subtitle}>Acompanhe suas solicitações de vaga.</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.Primary} size="large" />
          </View>
        ) : itens.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhuma carona ainda</Text>
            <Text style={styles.emptySubtitle}>
              Solicite uma vaga na aba Solicitar e ela aparecerá aqui.
            </Text>
            <Button
              title="Virar Motorista"
              onPress={() => router.push('/perfil/promover-motorista')}
              variant="outline"
              style={{ marginTop: 20, width: 200 }}
            />
          </View>
        ) : (
          <FlatList
            data={[
              ...(ativas.length > 0 ? [{ tipo: 'header', titulo: 'Ativas' } as any] : []),
              ...ativas,
              ...(historico.length > 0 ? [{ tipo: 'header', titulo: 'Histórico' } as any] : []),
              ...historico,
            ]}
            keyExtractor={(item, idx) =>
              item.tipo === 'header' ? `header-${idx}` : `sol-${item.sol.id}`
            }
            renderItem={({ item }) =>
              item.tipo === 'header'
                ? <Text style={passStyles.secaoTitulo}>{item.titulo}</Text>
                : renderItem({ item })
            }
            contentContainerStyle={{ gap: 0, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            onRefresh={carregar}
            refreshing={loading}
          />
        )}
      </View>

      {/* Modal avaliação */}
      <Modal visible={modalAvaliar} animationType="slide" transparent onRequestClose={() => setModalAvaliar(false)}>
        <View style={passStyles.modalOverlay}>
          <View style={passStyles.modalSheet}>
            <View style={passStyles.handle} />
            <Text style={passStyles.modalTitulo}>Avaliar motorista</Text>
            <Text style={passStyles.modalSub}>Sua avaliação é anônima e ajuda a comunidade.</Text>
            {buscandoMot ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={Colors.Primary} />
              </View>
            ) : (
              <>
                <Text style={passStyles.notaLabel}>Nota</Text>
                <Estrelas nota={nota} onChange={setNota} />
                <Text style={passStyles.notaLabel}>Comentário (opcional)</Text>
                <TextInput
                  style={passStyles.comentarioInput}
                  placeholder="Como foi a experiência?"
                  placeholderTextColor="#999"
                  value={comentario}
                  onChangeText={setComentario}
                  multiline numberOfLines={3} maxLength={200}
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => setModalAvaliar(false)} style={passStyles.cancelarBtn}>
                    <Text style={passStyles.cancelarText}>Agora não</Text>
                  </TouchableOpacity>
                  <Button
                    title="Enviar avaliação" onPress={enviarAvaliacao}
                    variant="primary" loading={enviandoAv} disabled={nota === 0}
                    style={{ flex: 1, minHeight: 46 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      {alertModal}
    </SafeAreaView>
  );
}

// ── Tela motorista ────────────────────────────────────────────────────────────

export default function MinhasRotinasScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const { historico } = useLocalSearchParams<{ historico?: string }>();

  const isPassageiro = user?.tipo !== 'MOTORISTA' || historico === '1';

  const [rotinas, setRotinas] = useState<RotinaResponse[]>([]);
  const [caronasExistentes, setCaronasExistentes] = useState<CaronaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState<number | null>(null);

  const [modalExcluirVisible, setModalExcluirVisible] = useState(false);
  const [rotinaIdParaExcluir, setRotinaIdParaExcluir] = useState<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [rotinaAtiva, setRotinaAtiva] = useState<RotinaResponse | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    if (isPassageiro) return;
    setLoading(true);
    try {
      const [listaRotinas, listaCaronas] = await Promise.all([
        rotinaService.listar(),
        caronaService.listarMinhasProximas(),
      ]);
      setRotinas(listaRotinas);
      setCaronasExistentes(listaCaronas);
    } catch {
      showAlert('Erro', 'Não foi possível carregar as rotinas.');
    } finally {
      setLoading(false);
    }
  }, [isPassageiro]);

  useFocusEffect(useCallback(() => { if (!isPassageiro) carregar(); }, [carregar, isPassageiro]));

  // param ?historico=1 → mostra histórico de corridas (fluxo passageiro) mesmo para motoristas
  if (isPassageiro) return <PassageiroCorridasScreen />;

  // ── Ações das rotinas ─────────────────────────────────────────────────────


  const handleEncerrar = (id: number) => {
    setRotinaIdParaExcluir(id);
    setModalExcluirVisible(true);
  };

  const confirmarExclusao = async (cancelarCaronas: boolean) => {
    if (!rotinaIdParaExcluir) return;
    const id = rotinaIdParaExcluir;
    setModalExcluirVisible(false);
    setRotinaIdParaExcluir(null);
    setAtualizando(id);
    try {
      await rotinaService.excluir(id, cancelarCaronas);
      setRotinas((p) => p.filter((r) => r.id !== id));
    } catch {
      showAlert('Erro', 'Não foi possível excluir a rotina.');
    } finally {
      setAtualizando(null);
    }
  };

  // ── Calendário ─────────────────────────────────────────────────────────────

  // Datas com carona AGENDADA da rotina ativa — bloqueadas no calendário
  const buildDatesComCarona = (rotinaId: number, base: MarkedDates): Set<string> => {
    const ocupadas = new Set<string>();
    caronasExistentes
      .filter((c) => c.rotinaId === rotinaId && c.status === 'AGENDADA')
      .forEach((c) => {
        const iso = typeof c.data === 'string' ? c.data : String(c.data);
        base[iso] = { disabled: true, disableTouchEvent: true, marked: true, dotColor: Colors.Primary };
        ocupadas.add(iso);
      });
    return ocupadas;
  };

  const abrirCalendario = async (rotina: RotinaResponse) => {
    setRotinaAtiva(rotina);
    setDatasSelecionadas([]);

    // Re-fetch para garantir que caronas canceladas fora desta tela não apareçam como bloqueadas
    let proximas = caronasExistentes;
    try {
      proximas = await caronaService.listarMinhasProximas();
      setCaronasExistentes(proximas);
    } catch { /* fallback para estado atual */ }

    const base = buildDisabledDates(rotina.diasDaSemana) as MarkedDates;
    proximas
      .filter((c) => c.rotinaId === rotina.id && c.status === 'AGENDADA')
      .forEach((c) => {
        const iso = typeof c.data === 'string' ? c.data : String(c.data);
        base[iso] = { disabled: true, disableTouchEvent: true, marked: true, dotColor: Colors.Primary };
      });
    setMarkedDates(base);
    setModalVisible(true);
  };

  const handleDayPress = (day: { dateString: string }) => {
    if (!rotinaAtiva) return;
    const iso = day.dateString;
    if (iso < minDate()) return;
    if (buildDisabledDates(rotinaAtiva.diasDaSemana)[iso]) return;

    // Impede selecionar data que já tem carona AGENDADA
    const jaTemCarona = caronasExistentes.some(
      (c) => c.rotinaId === rotinaAtiva.id && c.status === 'AGENDADA' &&
              (typeof c.data === 'string' ? c.data : String(c.data)) === iso
    );
    if (jaTemCarona) return;

    setDatasSelecionadas((prev) => {
      const next = prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso];
      const base = buildDisabledDates(rotinaAtiva.diasDaSemana) as MarkedDates;
      buildDatesComCarona(rotinaAtiva.id, base);
      next.forEach((d) => {
        base[d] = { ...(base[d] ?? {}), selected: true, selectedColor: Colors.Primary };
      });
      setMarkedDates(base);
      return next;
    });
  };

  const gerarCaronas = async () => {
    if (!rotinaAtiva || datasSelecionadas.length === 0) {
      showAlert('Atenção', 'Selecione ao menos uma data no calendário.');
      return;
    }
    setGerando(true);
    let sucesso = 0;
    const erros: string[] = [];
    for (const data of [...datasSelecionadas].sort()) {
      try {
        const carona = await rotinaService.gerarCarona(rotinaAtiva.id, data);
        setCaronasExistentes((prev) => [...prev, carona]);
        sucesso++;
      } catch (e) {
        erros.push(e instanceof Error ? e.message : 'Erro desconhecido');
      }
    }
    setGerando(false);
    setModalVisible(false);
    if (erros.length === 0) {
      showAlert('Caronas criadas!', `${sucesso} carona(s) disponível(is) para passageiros.`);
    } else if (sucesso === 0) {
      showAlert('Erro ao criar', erros[0]);
    } else {
      showAlert('Resultado parcial', `${sucesso} criada(s).\n\nErro: ${erros[0]}`);
    }
  };

  // ── Card de rotina ─────────────────────────────────────────────────────────

  const renderRotina = ({ item }: { item: RotinaResponse }) => {
    const isAtiva = item.status === 'ATIVA';
    const isEncerrada = item.status === 'ENCERRADA';
    const caronasDaRotina = caronasExistentes.filter((c) => c.rotinaId === item.id).length;

    const statusStyle = isAtiva ? styles.statusAtiva : styles.statusEncerrada;
    const statusTextStyle = isAtiva ? styles.statusAtivaText : styles.statusEncerradaText;

    return (
      <View style={[styles.card, isEncerrada && styles.cardInativo]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="map-outline" size={24} color={Colors.Primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardNome} numberOfLines={1}>
              {item.nome ?? `${pontoRota(item.origem)} → ${pontoRota(item.destino)}`}
            </Text>
            {item.nome && (
              <Text style={styles.cardRota} numberOfLines={1}>
                {pontoRota(item.origem)} → {pontoRota(item.destino)}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, statusStyle]}>
            <Text style={[styles.statusText, statusTextStyle]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={12} color={Colors.Primary} />
            <Text style={styles.badgeText}>{item.horarioSaida.slice(0, 5)}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="people-outline" size={12} color={Colors.Primary} />
            <Text style={styles.badgeText}>{item.vagasTotal} vagas</Text>
          </View>
          {caronasDaRotina > 0 && (
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={12} color={Colors.Primary} />
              <Text style={styles.badgeText}>{caronasDaRotina} agendada(s)</Text>
            </View>
          )}
        </View>

        <View style={styles.diasRow}>
          {[...item.diasDaSemana].sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b)).map((dia) => (
            <View key={dia} style={styles.diaTag}>
              <Text style={styles.diaTagText}>{DIA_LABEL[dia] ?? dia}</Text>
            </View>
          ))}
        </View>

        {item.observacoes && (
          <Text style={styles.cardObs} numberOfLines={2}>"{item.observacoes}"</Text>
        )}

        {!isEncerrada && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.acoes}>
              {isAtiva && (
                <Button
                  title="Abrir calendário"
                  onPress={() => abrirCalendario(item)}
                  variant="primary"
                  loading={atualizando === item.id}
                  style={styles.acaoCalBtn}
                />
              )}
              <View style={styles.acoesBtnRow}>
                <Button
                  title="Editar"
                  onPress={() => router.push(`/perfil/editar-rotina?id=${item.id}` as any)}
                  variant="outline"
                  style={styles.acaoBtnMetade}
                />
                <Button
                  title="Excluir"
                  onPress={() => handleEncerrar(item.id)}
                  variant="danger"
                  loading={atualizando === item.id}
                  style={styles.acaoBtnMetade}
                />
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Minhas Rotinas</Text>
          <Text style={styles.subtitle}>Gerencie os templates das suas caronas.</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.Primary} size="large" />
          </View>
        ) : rotinas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhuma rotina cadastrada</Text>
            <Text style={styles.emptySubtitle}>
              Crie sua primeira rotina para começar a oferecer caronas.
            </Text>
            <TouchableOpacity
              style={styles.criarBtn}
              onPress={() => router.push('/perfil/nova-rotina')}
            >
              <Text style={styles.criarBtnText}>Criar primeira rotina</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={rotinas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRotina}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={carregar}
            refreshing={loading}
          />
        )}
      </View>

      {/* FAB — Nova Rotina */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/perfil/nova-rotina')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de exclusão de rotina */}
      <Modal visible={modalExcluirVisible} transparent animationType="fade" onRequestClose={() => setModalExcluirVisible(false)}>
        <View style={styles.excluirOverlay}>
          <View style={styles.excluirCard}>
            <View style={styles.excluirIconWrap}>
              <Ionicons name="warning" size={32} color={Colors.Error} />
            </View>
            <Text style={styles.excluirTitulo}>Excluir rotina</Text>
            <Text style={styles.excluirAviso}>
              Esta ação é permanente e não pode ser desfeita. A rotina será excluída definitivamente.
            </Text>

            <View style={styles.excluirDivisor} />

            <Text style={styles.excluirPergunta}>
              Deseja também cancelar as caronas ativas desta rotina?
            </Text>
            <Text style={styles.excluirPerguntaSub}>
              Caronas com passageiros aprovados serão canceladas e as vagas liberadas.
            </Text>

            <TouchableOpacity
              style={styles.excluirBtnSim}
              onPress={() => confirmarExclusao(true)}
            >
              <Text style={styles.excluirBtnSimText}>Sim, cancelar as caronas e excluir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.excluirBtnNao}
              onPress={() => confirmarExclusao(false)}
            >
              <Text style={styles.excluirBtnNaoText}>Não, só excluir a rotina</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.excluirBtnCancelar}
              onPress={() => { setModalExcluirVisible(false); setRotinaIdParaExcluir(null); }}
            >
              <Text style={styles.excluirBtnCancelarText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal do calendário */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalFechar}>← Fechar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitulo} numberOfLines={1}>
              {rotinaAtiva?.nome ?? `${pontoRota(rotinaAtiva?.origem ?? '')} → ${pontoRota(rotinaAtiva?.destino ?? '')}`}
            </Text>
            <Text style={styles.modalSubtitulo}>
              Toque nas datas disponíveis para selecionar os dias que deseja criar caronas.
            </Text>
          </View>

          <View style={styles.legendaRow}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: Colors.PrimaryLight }]} />
              <Text style={styles.legendaText}>Carona existente</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: Colors.Primary }]} />
              <Text style={styles.legendaText}>Selecionada</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaDot, { backgroundColor: '#ccc' }]} />
              <Text style={styles.legendaText}>Dia inativo</Text>
            </View>
          </View>

          <View style={styles.calendarWrapper}>
            <Calendar
              minDate={minDate()}
              maxDate={maxDate()}
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                selectedDayBackgroundColor: Colors.Primary,
                selectedDayTextColor: '#fff',
                todayTextColor: Colors.Text,
                dotColor: Colors.PrimaryLight,
                selectedDotColor: '#fff',
                arrowColor: Colors.Primary,
                monthTextColor: Colors.Primary,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '600',
                disabledDayTextColor: '#ccc',
                calendarBackground: Colors.Surface,
              }}
              style={styles.calendar}
            />
          </View>

          <View style={styles.modalRodape}>
            <Text style={styles.modalContador}>
              {datasSelecionadas.length === 0
                ? 'Nenhuma data selecionada'
                : `${datasSelecionadas.length} data(s) selecionada(s)`}
            </Text>
            <Button
              title={`Gerar ${datasSelecionadas.length || ''} carona(s)`}
              onPress={gerarCaronas}
              variant="primary"
              loading={gerando}
              disabled={datasSelecionadas.length === 0}
              style={styles.modalBtn}
            />
          </View>
        </SafeAreaView>
      </Modal>
      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: Colors.SurfaceLight },
  container:  { flex: 1, padding: 20 },
  backBtn:   { padding: 4 },
  header:    { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  title:      { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitle:   { fontSize: 13, color: Colors.TextMuted, marginTop: 1 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.TextMuted, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.TextMuted, textAlign: 'center', paddingHorizontal: 20, marginBottom: 20 },
  criarBtn: {
    backgroundColor: Colors.Primary, borderRadius: 25, paddingHorizontal: 24, paddingVertical: 12,
  },
  criarBtnText: { color: Colors.TextLight, fontSize: 15, fontWeight: '700' },
  list:     { gap: 14 },

  card: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardInativo: { opacity: 0.55 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  cardIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardNome:    { fontSize: 16, fontWeight: '800', color: Colors.Primary },
  cardRota:    { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 14 },
  badgesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.Primary + '12', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText:   { fontSize: 12, fontWeight: '600', color: Colors.Primary },
  cardObs:     { fontSize: 12, fontStyle: 'italic', color: Colors.TextMuted, marginBottom: 4 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start', flexShrink: 0 },
  statusAtiva:    { backgroundColor: Colors.Success + '22', borderColor: Colors.Success },
  statusEncerrada:{ backgroundColor: '#99999922', borderColor: '#999999' },
  statusText:         { fontSize: 11, fontWeight: '700' },
  statusAtivaText:    { color: Colors.Success },
  statusEncerradaText:{ color: '#999999' },
  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  diaTag: {
    backgroundColor: Colors.Primary + '10', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.Primary + '30',
  },
  diaTagText: { color: Colors.Primary, fontSize: 12, fontWeight: '700' },
  acoes:         { gap: 8 },
  acaoCalBtn:    { minHeight: 44 },
  acoesBtnRow:   { flexDirection: 'row', gap: 8 },
  acaoBtnMetade: { flex: 1, minHeight: 40 },

  // Modal calendário
  modalSafe:     { flex: 1, backgroundColor: Colors.SurfaceLight },
  modalHeader:   { padding: 20, paddingBottom: 12 },
  modalFechar:   { color: Colors.Primary, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  modalTitulo:   { fontSize: 20, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  modalSubtitulo:{ fontSize: 13, color: Colors.TextMuted },
  legendaRow:    { flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingBottom: 12 },
  legendaItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaDot:    { width: 10, height: 10, borderRadius: 5 },
  legendaText:   { fontSize: 12, color: Colors.TextMuted },
  calendarWrapper: {
    marginHorizontal: 12, borderRadius: 16, overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  calendar: { borderRadius: 16 },
  modalRodape: {
    padding: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.SurfaceLight,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  modalContador:{ flex: 1, fontSize: 14, color: Colors.TextMuted, fontWeight: '600' },
  modalBtn:     { flex: 1, minHeight: 46, paddingVertical: 12 },

  // Modal exclusão
  excluirOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  excluirCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 24,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  excluirIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.Error + '15', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  excluirTitulo:     { fontSize: 20, fontWeight: '800', color: Colors.Text, marginBottom: 8, textAlign: 'center' },
  excluirAviso:      { fontSize: 13, color: Colors.TextMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  excluirDivisor:    { width: '100%', height: 1, backgroundColor: Colors.SurfaceLight, marginBottom: 16 },
  excluirPergunta:   { fontSize: 15, fontWeight: '700', color: Colors.Text, textAlign: 'center', marginBottom: 6 },
  excluirPerguntaSub:{ fontSize: 12, color: Colors.TextMuted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  excluirBtnSim: {
    width: '100%', backgroundColor: Colors.Error, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  excluirBtnSimText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  excluirBtnNao: {
    width: '100%', borderWidth: 1.5, borderColor: Colors.Error, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  excluirBtnNaoText:    { color: Colors.Error, fontWeight: '700', fontSize: 14 },
  excluirBtnCancelar:   { paddingVertical: 10 },
  excluirBtnCancelarText:{ color: Colors.TextMuted, fontSize: 14, textDecorationLine: 'underline' },
});

// ── Estilos do passageiro ─────────────────────────────────────────────────────

const passStyles = StyleSheet.create({
  secaoTitulo: {
    fontSize: 11, fontWeight: '800', color: Colors.TextMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 16, marginBottom: 10,
  },
  cardWrap: { marginBottom: 12 },
  card: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  iniciaDot: {
    position: 'absolute', top: -4, right: -4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF6B00',
    borderWidth: 1.5, borderColor: '#fff',
    zIndex: 10,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  kebabBtn:     { padding: 4 },
  cardNome:     { fontSize: 15, fontWeight: '800', color: Colors.Primary },
  cardInfo:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardInfoText: { fontSize: 12, color: Colors.TextMuted },
  cardInfoSep:  { fontSize: 12, color: Colors.TextMuted, marginHorizontal: 2 },
  cardDivider:  { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 12 },
  destRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destText:     { fontSize: 13, color: Colors.TextMuted, flex: 1 },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  statusText:   { fontSize: 11, fontWeight: '700' },
  cardActions:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn:    { flex: 1, minHeight: 42 },
  avaliadoBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  avaliadoText: { fontSize: 13, color: Colors.Success, fontWeight: '700' },

  // Modal avaliação
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.Surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  modalTitulo:  { fontSize: 20, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  modalSub:     { fontSize: 13, color: Colors.TextMuted, marginBottom: 20, lineHeight: 19 },
  notaLabel:    { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 12 },
  comentarioInput: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.Text, minHeight: 80, marginBottom: 8,
  },
  cancelarBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD',
  },
  cancelarText: { fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
});
