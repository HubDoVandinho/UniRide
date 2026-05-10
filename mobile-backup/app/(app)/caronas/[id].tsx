import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import {
  CaronaResponse,
  PerfilPublicoResponse,
  RotaResponse,
  SolicitacaoResponse,
  StatusSolicitacao,
} from '@/types/api.types';
import { amizadeService } from '@/services/amizade.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CARONA_LABEL: Record<string, string> = {
  AGENDADA:     'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA:    'Concluída',
  CANCELADA:    'Cancelada',
};

const STATUS_CARONA_COLOR: Record<string, string> = {
  AGENDADA:     '#FF9800',
  EM_ANDAMENTO: '#2196F3',
  CONCLUIDA:    Colors.Success,
  CANCELADA:    '#9E9E9E',
};

const STATUS_SOLIC_LABEL: Record<StatusSolicitacao, string> = {
  PENDENTE:  'Pendente',
  APROVADA:  'Aprovada',
  RECUSADA:  'Recusada',
  EMBARCADO: 'Embarcado',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_SOLIC_COLOR: Record<StatusSolicitacao, string> = {
  PENDENTE:  '#FF9800',
  APROVADA:  Colors.Success,
  RECUSADA:  Colors.Error,
  EMBARCADO: '#2196F3',
  CONCLUIDA: '#9E9E9E',
  CANCELADA: '#9E9E9E',
};

// ── Tags de avaliação ─────────────────────────────────────────────────────────

const TAGS_MOTORISTA: string[] = [
  'Viagem confortável', 'Motorista educado', 'Direção segura', 'Carro limpo',
  'Boa conversa', 'Chegou rápido', 'Excelente serviço',
  'Direção perigosa', 'Direção brusca', 'Excesso de velocidade', 'Rota ruim',
  'Demorou para chegar', 'Não seguiu o GPS', 'Veículo sujo', 'Veículo com mau cheiro',
  'Problemas com o carro', 'Falta de profissionalismo', 'Motorista rude',
  'Conversa inadequada', 'Uso de celular ao dirigir',
];

const TAGS_PASSAGEIRO: string[] = [
  'Passageiro educado', 'Pontual', 'Respeitoso',
  'Sujou o carro', 'Foi rude', 'Demorou para embarcar',
];

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }

function formatarData(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${diasSemana[d.getDay()]}, ${day} ${meses[month - 1]}`;
}

// ── Estrelas ──────────────────────────────────────────────────────────────────

function Estrelas({
  nota,
  onChange,
}: {
  nota: number;
  onChange?: (n: number) => void;
}) {
  return (
    <View style={styles.estrelasRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange?.(n)}
          disabled={!onChange}
          activeOpacity={0.7}
        >
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

// ── Modal de avaliação ────────────────────────────────────────────────────────

interface PessoaParaAvaliar {
  participanteId: number;
  nome: string;
  nota: number;
  comentario: string;
  tags: string[];
  papel: 'MOTORISTA' | 'PASSAGEIRO';
  enviada: boolean;
}

function ModalAvaliacao({
  visible,
  pessoas,
  caronaId,
  onClose,
  onChange,
  onTagToggle,
  onEnviar,
  enviando,
}: {
  visible: boolean;
  pessoas: PessoaParaAvaliar[];
  caronaId: number;
  onClose: () => void;
  onChange: (participanteId: number, field: 'nota' | 'comentario', value: number | string) => void;
  onTagToggle: (participanteId: number, tag: string) => void;
  onEnviar: () => void;
  enviando: boolean;
}) {
  const todas = pessoas.every((p) => p.enviada);
  const [tagsExpandidas, setTagsExpandidas] = useState<Set<number>>(new Set());
  const TAGS_VISIVEIS = 7;

  const toggleExpandir = (id: number) =>
    setTagsExpandidas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitulo}>Como foi a carona?</Text>
          <Text style={styles.modalSubtitulo}>Sua avaliação é anônima e ajuda a comunidade.</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {pessoas.map((p) => (
              <View key={p.participanteId} style={styles.avaliacaoItem}>
                <View style={styles.avaliacaoHeader}>
                  <View style={styles.avaliacaoAvatar}>
                    <Text style={styles.avaliacaoAvatarText}>
                      {p.nome.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.avaliacaoNome} numberOfLines={1}>{p.nome}</Text>
                  {p.enviada && (
                    <View style={styles.avaliacaoEnviadaBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.Success} />
                      <Text style={styles.avaliacaoEnviada}>Enviada</Text>
                    </View>
                  )}
                </View>
                {!p.enviada && (
                  <>
                    <Text style={styles.notaLabel}>Nota</Text>
                    <Estrelas
                      nota={p.nota}
                      onChange={(n) => onChange(p.participanteId, 'nota', n)}
                    />
                    <Text style={styles.tagsLabel}>O que destacou? (opcional)</Text>
                    {(() => {
                      const todasTags = p.papel === 'MOTORISTA' ? TAGS_MOTORISTA : TAGS_PASSAGEIRO;
                      const expandida = tagsExpandidas.has(p.participanteId);
                      const visiveis = expandida ? todasTags : todasTags.slice(0, TAGS_VISIVEIS);
                      const temMais = todasTags.length > TAGS_VISIVEIS;
                      return (
                        <>
                          <View style={styles.tagsContainer}>
                            {visiveis.map((tag) => {
                              const selecionada = p.tags.includes(tag);
                              return (
                                <TouchableOpacity
                                  key={tag}
                                  style={[styles.tagChip, selecionada && styles.tagChipSelecionada]}
                                  onPress={() => onTagToggle(p.participanteId, tag)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.tagChipText, selecionada && styles.tagChipTextSelecionada]}>
                                    {tag}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {temMais && (
                            <TouchableOpacity
                              onPress={() => toggleExpandir(p.participanteId)}
                              style={styles.tagsVerMais}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.tagsVerMaisText}>
                                {expandida
                                  ? 'Ver menos'
                                  : `Ver mais (${todasTags.length - TAGS_VISIVEIS})`}
                              </Text>
                              <Ionicons
                                name={expandida ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={Colors.Primary}
                              />
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    })()}
                    <Text style={styles.comentarioLabel}>Comentário (opcional)</Text>
                    <TextInput
                      style={styles.avaliacaoInput}
                      placeholder="Como foi a experiência?"
                      placeholderTextColor="#999"
                      value={p.comentario}
                      onChangeText={(t) => onChange(p.participanteId, 'comentario', t)}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                      textAlignVertical="top"
                    />
                  </>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalRodape}>
            {todas ? (
              <Button title="Fechar" onPress={onClose} variant="primary" style={styles.enviarBtn} />
            ) : (
              <>
                <TouchableOpacity onPress={onClose} style={styles.cancelarBtn}>
                  <Text style={styles.cancelarBtnText}>Agora não</Text>
                </TouchableOpacity>
                <Button
                  title="Enviar avaliações"
                  onPress={onEnviar}
                  variant="primary"
                  loading={enviando}
                  disabled={pessoas.some((p) => !p.enviada && p.nota === 0)}
                  style={styles.enviarBtn}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function CaronaDetalheScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const {
    solicitacoesVistas, marcarSolicitacoesVistasDaCarona,
    caronasComMensagemNova, ultimaMensagemVista,
    marcarMensagemNova, marcarChatVisto, marcarNegativoVisto,
  } = useNotificationStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caronaId = Number(id);
  const isMotorista = user?.tipo === 'MOTORISTA';

  const [carona, setCarona] = useState<CaronaResponse | null>(null);
  const [motorista, setMotorista] = useState<PerfilPublicoResponse | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoResponse[]>([]);
  const [minhaSolicitacao, setMinhaSolicitacao] = useState<SolicitacaoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState<number | null>(null);
  const [processando, setProcessando] = useState(false);
  const [rota, setRota] = useState<RotaResponse | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinSolId, setPinSolId] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [carregandoRota, setCarregandoRota] = useState(false);

  const prevCaronaStatusRef = useRef<string | null>(null);

  // Avaliação
  const [modalAvaliar, setModalAvaliar] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<PessoaParaAvaliar[]>([]);
  const [enviandoAvaliacoes, setEnviandoAvaliacoes] = useState(false);

  // ── Carregamento ────────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [caronaData, solicData] = await Promise.all([
        caronaService.buscarPorId(caronaId),
        caronaService.listarPorCarona(caronaId),
      ]);
      setCarona(caronaData);
      setSolicitacoes(solicData);
      prevCaronaStatusRef.current = caronaData.status;
      if (!isMotorista && user) {
        setMinhaSolicitacao(solicData.find((s) => s.passageiroId === user.id) ?? null);
      }
      try {
        setMotorista(await amizadeService.perfilPublico(caronaData.motoristaId));
      } catch {
        setMotorista(null);
      }
    } catch {
      showAlert('Erro', 'Não foi possível carregar os detalhes da carona.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [caronaId, isMotorista, user]);

  useEffect(() => { carregar(); }, [carregar]);

  // Ref para ultimaMensagemVista — evita re-criar callbacks quando o objeto muda
  const ultimaMensagemVistaRef = useRef<Record<number, number>>({});
  useEffect(() => { ultimaMensagemVistaRef.current = ultimaMensagemVista; }, [ultimaMensagemVista]);

  const verificarMensagens = useCallback(async () => {
    if (!user) return;
    try {
      const msgs = await caronaService.listarMensagens(caronaId);
      if (msgs.length === 0) return;
      const ultimaVista = ultimaMensagemVistaRef.current[caronaId] ?? 0;
      const temNova = msgs.some(
        (m) => m.tipo !== 'PIX_KEY' && m.remetenteId !== user.id && m.id > ultimaVista
      );
      if (temNova) marcarMensagemNova(caronaId);
    } catch { /* não-participante ou erro de rede */ }
  }, [caronaId, user, marcarMensagemNova]);

  // Roda toda vez que a tela ganha foco — inclusive ao voltar do chat
  useFocusEffect(
    useCallback(() => { verificarMensagens(); }, [verificarMensagens])
  );

  // ── Polling 10s ─────────────────────────────────────────────────────────────

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSilencioso = useCallback(async () => {
    try {
      const [caronaData, solicData] = await Promise.all([
        caronaService.buscarPorId(caronaId),
        caronaService.listarPorCarona(caronaId),
      ]);
      setCarona(caronaData);
      setSolicitacoes(solicData);
      if (isMotorista) {
        marcarSolicitacoesVistasDaCarona(
          solicData.filter((s) => s.status === 'PENDENTE').map((s) => s.id),
        );
      }
      if (!isMotorista && user) {
        const minhaSolic = solicData.find((s) => s.passageiroId === user.id) ?? null;
        setMinhaSolicitacao(minhaSolic);

        const foiConcluida =
          caronaData.status === 'CONCLUIDA' &&
          prevCaronaStatusRef.current !== null &&
          prevCaronaStatusRef.current !== 'CONCLUIDA';

        if (foiConcluida && minhaSolic && !minhaSolic.jaAvaliouMotorista) {
          setAvaliacoes([{
            participanteId: caronaData.motoristaId,
            nome: 'Motorista',
            nota: 0,
            comentario: '',
            tags: [],
            papel: 'MOTORISTA',
            enviada: false,
          }]);
          setModalAvaliar(true);
        }
      }
      prevCaronaStatusRef.current = caronaData.status;
      await verificarMensagens();
    } catch {
      // silent — ignora erros em background refresh
    }
  }, [caronaId, isMotorista, user, verificarMensagens]);

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

  // ── Rota ────────────────────────────────────────────────────────────────────

  const handleGerarRota = async () => {
    if (rota) {
      mostrarRota(rota);
      return;
    }

    // Verifica permissão de localização
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'GPS necessário',
        'Permita o acesso à localização para usar a Rota Otimizada.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Configurações', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    // Verifica se o serviço de GPS está ativo
    const ativo = await Location.hasServicesEnabledAsync();
    if (!ativo) {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          showAlert('GPS desligado', 'Ligue o GPS para usar a Rota Otimizada.');
          return;
        }
      } else {
        showAlert(
          'GPS desligado',
          'Ligue o GPS nas configurações para usar a Rota Otimizada.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }

    setCarregandoRota(true);
    try {
      const r = await caronaService.gerarRota(caronaId);
      setRota(r);
      mostrarRota(r);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível gerar a rota.');
    } finally {
      setCarregandoRota(false);
    }
  };

  const mostrarRota = (r: RotaResponse) => {
    const opcoes: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }> = [];
    if (r.linkGoogleMaps) {
      opcoes.push({ text: 'Google Maps', onPress: () => Linking.openURL(r.linkGoogleMaps) });
    }
    opcoes.push({ text: 'Fechar', style: 'cancel' });

    const dist = r.distanciaTotalKm ? ` • ${r.distanciaTotalKm.toFixed(1)} km` : '';
    const paradas = r.waypoints?.length
      ? `\n${r.waypoints.length} parada(s) de embarque${dist}`
      : dist;

    showAlert('Rota otimizada', `Pontos de embarque ordenados por proximidade.${paradas}`, opcoes);
  };

  // ── Ações do motorista sobre a carona ───────────────────────────────────────

  const executarIniciar = async () => {
    setProcessando(true);
    try {
      const atualizada = await caronaService.iniciar(caronaId);
      setCarona(atualizada);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível iniciar.');
    } finally {
      setProcessando(false);
    }
  };

  const handleIniciar = () => {
    const aprovados = solicitacoes.filter((s) => s.status === 'APROVADA' || s.status === 'EMBARCADO');
    if (aprovados.length === 0) {
      showAlert('Sem passageiros', 'Aprove pelo menos um passageiro antes de iniciar.');
      return;
    }
    showAlert('Iniciar carona', `Iniciar com ${aprovados.length} passageiro(s) aprovado(s)?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Iniciar', onPress: executarIniciar },
    ]);
  };

  const handleConcluir = () => {
    showAlert('Concluir carona', 'Confirma que a carona foi concluída?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Concluir',
        onPress: async () => {
          setProcessando(true);
          try {
            const atualizada = await caronaService.concluir(caronaId);
            setCarona(atualizada);
            await carregar();
            abrirAvaliacaoMotorista();
          } catch (e: unknown) {
            showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível concluir.');
          } finally {
            setProcessando(false);
          }
        },
      },
    ]);
  };

  const handleCancelarCarona = () => {
    showAlert('Cancelar carona', 'Esta ação não pode ser desfeita. Deseja cancelar a carona?', [
      {
        text: 'Cancelar carona',
        style: 'destructive',
        onPress: async () => {
          setProcessando(true);
          try {
            await caronaService.cancelarCarona(caronaId);
            router.back();
          } catch (e: unknown) {
            showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível cancelar.');
          } finally {
            setProcessando(false);
          }
        },
      },
      { text: 'Não', style: 'cancel' },
    ]);
  };

  // ── Ações sobre solicitações ─────────────────────────────────────────────────

  const executarSolicitacao = async (
    solId: number,
    acao: () => Promise<SolicitacaoResponse>
  ) => {
    setAtualizando(solId);
    try {
      const atualizada = await acao();
      setSolicitacoes((prev) => prev.map((s) => s.id === solId ? atualizada : s));
      await carregar();
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Erro ao processar.');
    } finally {
      setAtualizando(null);
    }
  };

  const handleRemoverPassageiro = (sol: SolicitacaoResponse) => {
    const nome = sol.nomePassageiro ?? `Passageiro #${sol.passageiroId}`;
    showAlert('Remover passageiro', `Remover ${nome} da carona?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => executarSolicitacao(sol.id, () => caronaService.recusarSolicitacao(sol.id)),
      },
    ]);
  };

  // ── Ações do passageiro ──────────────────────────────────────────────────────

  const handleAbrirMapaPassageiro = handleGerarRota;

  const handleCancelarSolicitacao = () => {
    if (!minhaSolicitacao) return;
    showAlert('Sair da carona', 'Deseja cancelar sua solicitação?', [
      {
        text: 'Cancelar solicitação',
        style: 'destructive',
        onPress: async () => {
          setProcessando(true);
          try {
            await caronaService.cancelarSolicitacao(minhaSolicitacao.id);
            marcarNegativoVisto(minhaSolicitacao.id);
            setMinhaSolicitacao((prev) =>
              prev ? { ...prev, status: 'CANCELADA' } : prev
            );
          } catch (e: unknown) {
            showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível cancelar.');
          } finally {
            setProcessando(false);
          }
        },
      },
      { text: 'Não', style: 'cancel' },
    ]);
  };

  const handleAbrirPinModal = (sol: SolicitacaoResponse) => {
    setPinSolId(sol.id);
    setPinInput('');
    setPinModalVisible(true);
  };

  const handleConfirmarEmbarqueComPin = async () => {
    if (!pinSolId || pinInput.length !== 4) return;
    setProcessando(true);
    try {
      const atualizada = await caronaService.confirmarEmbarqueComPin(pinSolId, pinInput);
      setSolicitacoes((prev) => prev.map((s) => s.id === atualizada.id ? atualizada : s));
      setPinModalVisible(false);
    } catch (e: unknown) {
      showAlert('PIN inválido', e instanceof Error ? e.message : 'Código incorreto. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  // ── Avaliação ────────────────────────────────────────────────────────────────

  const abrirAvaliacaoMotorista = () => {
    const embarcados = solicitacoes.filter(
      (s) => s.status === 'EMBARCADO' || s.status === 'CONCLUIDA'
    );
    if (embarcados.length === 0) return;
    setAvaliacoes(
      embarcados.map((s) => ({
        participanteId: s.passageiroId,
        nome: s.nomePassageiro ?? `Passageiro #${s.passageiroId}`,
        nota: 0,
        comentario: '',
        tags: [],
        papel: 'PASSAGEIRO' as const,
        enviada: false,
      }))
    );
    setModalAvaliar(true);
  };

  const abrirAvaliacaoPassageiro = () => {
    if (!carona) return;
    setAvaliacoes([{
      participanteId: carona.motoristaId,
      nome: 'Motorista',
      nota: 0,
      comentario: '',
      tags: [],
      papel: 'MOTORISTA',
      enviada: false,
    }]);
    setModalAvaliar(true);
  };

  const handleMudarAvaliacao = (
    participanteId: number,
    field: 'nota' | 'comentario',
    value: number | string
  ) => {
    setAvaliacoes((prev) =>
      prev.map((a) =>
        a.participanteId === participanteId ? { ...a, [field]: value } : a
      )
    );
  };

  const handleToggleTag = (participanteId: number, tag: string) => {
    setAvaliacoes((prev) =>
      prev.map((a) => {
        if (a.participanteId !== participanteId) return a;
        const jatem = a.tags.includes(tag);
        return { ...a, tags: jatem ? a.tags.filter((t) => t !== tag) : [...a.tags, tag] };
      })
    );
  };

  const handleEnviarAvaliacoes = async () => {
    setEnviandoAvaliacoes(true);
    for (const av of avaliacoes) {
      if (av.enviada || av.nota === 0) continue;
      try {
        await caronaService.avaliar({
          avaliadoId: av.participanteId,
          caronaId,
          nota: av.nota,
          comentario: av.comentario || undefined,
          tags: av.tags.length > 0 ? av.tags : undefined,
        });
        setAvaliacoes((prev) =>
          prev.map((a) =>
            a.participanteId === av.participanteId ? { ...a, enviada: true } : a
          )
        );
      } catch {
        // silencia erros individuais (já avaliado, etc.)
        setAvaliacoes((prev) =>
          prev.map((a) =>
            a.participanteId === av.participanteId ? { ...a, enviada: true } : a
          )
        );
      }
    }
    setEnviandoAvaliacoes(false);
    // Atualiza carona e solicitações para refletir estado de avaliação
    await carregar();
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading || !carona) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const statusCor = STATUS_CARONA_COLOR[carona.status] ?? '#9E9E9E';
  const isoData = typeof carona.data === 'string' ? carona.data : String(carona.data);
  const passageirosAtivos = solicitacoes.filter(
    (s) => s.status === 'APROVADA' || s.status === 'EMBARCADO' || s.status === 'PENDENTE'
  );

  // Exclui RECUSADA e CANCELADA da lista visível (backend já filtra, mas estado local pode ter temporariamente)
  const solicitacoesVisiveis = solicitacoes.filter(
    (s) => s.status !== 'RECUSADA' && s.status !== 'CANCELADA'
  );

  // Passageiros ordenados: usuário atual sempre primeiro
  const solicitacoesOrdenadas = [
    ...solicitacoesVisiveis.filter((s) => s.passageiroId === user?.id),
    ...solicitacoesVisiveis.filter((s) => s.passageiroId !== user?.id),
  ];
  const podeIniciar = carona.status === 'AGENDADA' && isMotorista;
  const podeConcluir = carona.status === 'EM_ANDAMENTO' && isMotorista;
  const podeCancelar = carona.status === 'AGENDADA' && isMotorista;
  const podeGerarRota = isMotorista &&
    carona.status === 'EM_ANDAMENTO' &&
    solicitacoes.some((s) => s.status === 'APROVADA' || s.status === 'EMBARCADO');
  const podeVerMapaPassageiro = !isMotorista &&
    carona.status === 'EM_ANDAMENTO' &&
    (minhaSolicitacao?.status === 'APROVADA' || minhaSolicitacao?.status === 'EMBARCADO');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} colors={[Colors.Primary]} tintColor={Colors.Primary} />}
      >

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: statusCor + '22', borderColor: statusCor }]}>
              <Text style={[styles.statusText, { color: statusCor }]}>
                {STATUS_CARONA_LABEL[carona.status] ?? carona.status}
              </Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            {(podeGerarRota || podeVerMapaPassageiro) && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={podeGerarRota ? handleGerarRota : handleAbrirMapaPassageiro}
                disabled={carregandoRota}
                activeOpacity={0.7}
              >
                {carregandoRota
                  ? <ActivityIndicator size="small" color={Colors.Primary} />
                  : <Ionicons name="map-outline" size={22} color={Colors.Primary} />
                }
              </TouchableOpacity>
            )}
            {(carona.status === 'AGENDADA' || carona.status === 'EM_ANDAMENTO' || carona.status === 'CONCLUIDA') &&
              (isMotorista || (minhaSolicitacao && minhaSolicitacao.status !== 'CANCELADA' && minhaSolicitacao.status !== 'RECUSADA' && minhaSolicitacao.status !== 'PENDENTE')) && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push({ pathname: '/chat/[caronaId]', params: { caronaId: String(caronaId) } })}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubbles-outline" size={22} color={Colors.Primary} />
                {caronasComMensagemNova.includes(caronaId) && (
                  <View style={styles.chatBadgeDot} />
                )}
              </TouchableOpacity>
            )}
            {!isMotorista && minhaSolicitacao &&
              (minhaSolicitacao.status === 'PENDENTE' || minhaSolicitacao.status === 'APROVADA') && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={handleCancelarSolicitacao} activeOpacity={0.7}>
                <Ionicons name="exit-outline" size={22} color={Colors.Error} />
              </TouchableOpacity>
            )}
            {podeCancelar && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={handleCancelarCarona} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={22} color={Colors.Error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Título */}
        <Text style={styles.caronaTitulo}>
          {carona.nome ?? `${pontoRota(carona.origem)} → ${pontoRota(carona.destino)}`}
        </Text>

        {/* Endereços */}
        <View style={styles.enderecoCard}>
          <View style={styles.rotaItem}>
            <View style={styles.rotaDotOrigem} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rotaBairro}>{pontoRota(carona.origem)}</Text>
              {carona.bairroOrigem ? <Text style={styles.rotaEndereco}>{carona.bairroOrigem}</Text> : null}
            </View>
          </View>
          <View style={styles.rotaLinha} />
          <View style={styles.rotaItem}>
            <View style={styles.rotaDotDestino} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rotaBairro}>{pontoRota(carona.destino)}</Text>
              {carona.bairroDestino ? <Text style={styles.rotaEndereco}>{carona.bairroDestino}</Text> : null}
            </View>
          </View>
        </View>

        {/* Linha de info: Data · Horário · Vagas */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={16} color={Colors.Primary} />
            <Text style={styles.infoCardLabel}>Data</Text>
            <Text style={styles.infoCardValor}>{formatarData(isoData)}</Text>
          </View>
          <View style={styles.infoCardSep} />
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={16} color={Colors.Primary} />
            <Text style={styles.infoCardLabel}>Horário</Text>
            <Text style={styles.infoCardValor}>{carona.horarioSaida.slice(0, 5)}</Text>
          </View>
          <View style={styles.infoCardSep} />
          <View style={styles.infoCard}>
            <Ionicons name="people-outline" size={16} color={Colors.Primary} />
            <Text style={styles.infoCardLabel}>Vagas</Text>
            <Text style={styles.infoCardValor}>{carona.vagasDisponiveis}/{carona.vagasTotal}</Text>
          </View>
        </View>

        {carona.valorSugerido != null && (
          <View style={styles.infoTileValorSugerido}>
            <View style={styles.tileIconWrap}>
              <Ionicons name="cash-outline" size={20} color={Colors.Primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardLabel}>Contribuição sugerida</Text>
              <View style={styles.valorRow}>
                <Text style={styles.valorPorPessoa}>
                  R$ {carona.valorSugerido.toFixed(2)}
                  <Text style={styles.valorPorPessoaLabel}> /integrante</Text>
                </Text>
                {carona.custoTotal != null && (
                  <Text style={styles.valorTotal}>
                    Total: R$ {carona.custoTotal.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {(carona.veiculoMarca || carona.veiculoModelo || carona.veiculoTipo) && (
          <View style={styles.veiculoRow}>
            <View style={styles.tileIconWrap}>
              <Ionicons name="car-sport-outline" size={20} color={Colors.Primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.veiculoLabel}>Veículo</Text>
              <Text style={styles.veiculoValor}>
                {[carona.veiculoMarca, carona.veiculoModelo].filter(Boolean).join(' ')}
              </Text>
            </View>
            {carona.veiculoPlaca && (
              <View style={styles.placaBadge}>
                <Text style={styles.placaText}>{carona.veiculoPlaca.toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}

        {carona.observacoes && (
          <View style={styles.obsCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.TextMuted} style={{ marginTop: 1 }} />
            <Text style={styles.obsTexto}>{carona.observacoes}</Text>
          </View>
        )}

        {/* ── Card do motorista ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Motorista</Text>
          <TouchableOpacity
            style={styles.passageiroCard}
            onPress={() => carona.motoristaId !== user?.id && router.push({ pathname: '/perfil/[id]', params: { id: carona.motoristaId } })}
            activeOpacity={carona.motoristaId !== user?.id ? 0.75 : 1}
          >
            <View style={styles.passageiroHeader}>
              <View style={[styles.passageiroAvatar, { backgroundColor: Colors.Primary }]}>
                {motorista?.fotoPerfil
                  ? <Image source={{ uri: motorista.fotoPerfil }} style={styles.passageiroAvatarImg} />
                  : <Text style={styles.passageiroAvatarText}>{(motorista?.nome ?? 'M').charAt(0).toUpperCase()}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passageiroNome} numberOfLines={1}>
                  {carona.motoristaId === user?.id ? 'Você' : (motorista?.nome ?? `Motorista #${carona.motoristaId}`)}
                </Text>
                {motorista?.avaliacaoMedia != null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={11} color="#FFD700" />
                    <Text style={styles.passageiroEndereco}>{motorista.avaliacaoMedia.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Lista de passageiros ── */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>
            Passageiros{passageirosAtivos.length > 0 ? ` (${passageirosAtivos.length})` : ''}
          </Text>

          {solicitacoesOrdenadas.length === 0 ? (
            <Text style={styles.vazio}>Nenhuma solicitação ainda.</Text>
          ) : (
            solicitacoesOrdenadas.map((sol) => {
              const cor = STATUS_SOLIC_COLOR[sol.status];
              const inicial = (sol.nomePassageiro ?? 'P').charAt(0).toUpperCase();
              const eUsuario = sol.passageiroId === user?.id;
              return (
                <View key={sol.id} style={styles.passageiroCard}>
                  <TouchableOpacity
                    style={styles.passageiroHeader}
                    onPress={() => !eUsuario && router.push({ pathname: '/perfil/[id]', params: { id: sol.passageiroId } })}
                    activeOpacity={!eUsuario ? 0.75 : 1}
                  >
                    <View style={styles.passageiroAvatar}>
                      {sol.fotoPassageiro
                        ? <Image source={{ uri: sol.fotoPassageiro }} style={styles.passageiroAvatarImg} />
                        : <Text style={styles.passageiroAvatarText}>{inicial}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.passageiroNome} numberOfLines={1}>
                        {eUsuario ? 'Você' : (sol.nomePassageiro ?? `Passageiro #${sol.passageiroId}`)}
                      </Text>
                      {sol.enderecoDestino && (
                        <Text style={styles.passageiroEndereco} numberOfLines={1}>
                          📍 {sol.enderecoDestino.split(',').slice(0, 2).join(',')}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      {isMotorista && sol.status === 'PENDENTE' && !solicitacoesVistas.includes(sol.id) && (
                        <View style={styles.avatarPendenteDot} />
                      )}
                      {(sol.status === 'PENDENTE' || sol.status === 'APROVADA') && (() => {
                        const pago = sol.status === 'APROVADA' && sol.statusPagamento === 'PAGO_CONFIRMADO';
                        const badgeCor = pago ? Colors.Success : cor;
                        return (
                          <View style={[styles.solBadge, { backgroundColor: badgeCor + '22', borderColor: badgeCor }]}>
                            <Text style={[styles.solBadgeText, { color: badgeCor }]}>
                              {pago ? 'Pago' : STATUS_SOLIC_LABEL[sol.status]}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </TouchableOpacity>
                  {sol.statusPagamento && sol.statusPagamento !== 'PENDENTE' && (
                    <View style={[
                      styles.pagBadge,
                      {
                        backgroundColor: sol.statusPagamento === 'PAGO_CONFIRMADO'
                          ? Colors.Success + '20' : '#FF980020',
                        borderColor: sol.statusPagamento === 'PAGO_CONFIRMADO'
                          ? Colors.Success : '#FF9800',
                      },
                    ]}>
                      <Ionicons
                        name={sol.statusPagamento === 'PAGO_CONFIRMADO' ? 'checkmark-circle' : 'time-outline'}
                        size={11}
                        color={sol.statusPagamento === 'PAGO_CONFIRMADO' ? Colors.Success : '#FF9800'}
                      />
                      <Text style={[
                        styles.pagBadgeText,
                        { color: sol.statusPagamento === 'PAGO_CONFIRMADO' ? Colors.Success : '#FF9800' },
                      ]}>
                        {sol.statusPagamento === 'PAGO_CONFIRMADO' ? 'Pago' : 'Comprovante enviado'}
                      </Text>
                    </View>
                  )}
                  {sol.mensagem && sol.status === 'PENDENTE' && (
                    <Text style={styles.passageiroMensagem}>"{sol.mensagem}"</Text>
                  )}
                  {/* Ações do motorista */}
                  {isMotorista && (sol.status === 'PENDENTE' || (sol.status === 'APROVADA' && carona.status === 'EM_ANDAMENTO')) && (
                    <>
                    <View style={styles.passageiroDivider} />
                    <View style={styles.passageiroAcoes}>
                      {sol.status === 'PENDENTE' && (
                        <>
                          <TouchableOpacity
                            style={[styles.btnSol, styles.btnAprovar, atualizando === sol.id && styles.btnDisabled]}
                            onPress={() => executarSolicitacao(sol.id, () => caronaService.aprovarSolicitacao(sol.id))}
                            disabled={atualizando === sol.id}
                          >
                            <Text style={styles.btnSolTexto}>✓ Aprovar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btnSol, styles.btnRecusar, atualizando === sol.id && styles.btnDisabled]}
                            onPress={() => handleRemoverPassageiro(sol)}
                            disabled={atualizando === sol.id}
                          >
                            <Text style={styles.btnSolTexto}>✕ Recusar</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {sol.status === 'APROVADA' && (() => {
                        if (carona.status !== 'EM_ANDAMENTO') return null;
                        return (
                          <>
                            <TouchableOpacity
                              style={[styles.btnSol, styles.btnEmbarcar, atualizando === sol.id && styles.btnDisabled]}
                              onPress={() => handleAbrirPinModal(sol)}
                              disabled={atualizando === sol.id}
                            >
                              <Ionicons name="key-outline" size={24} color={Colors.Primary} />
                              <Text style={[styles.btnSolTexto, { color: Colors.Primary, textAlign: 'center', flex: 1 }]}>{'Confirmar\nEmbarque'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btnSol, styles.btnNaoCompareceu, atualizando === sol.id && styles.btnDisabled]}
                              onPress={() =>
                                showAlert('Não compareceu', 'A vaga será devolvida.', [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Confirmar',
                                    style: 'destructive',
                                    onPress: () => executarSolicitacao(sol.id, () => caronaService.naoCompareceu(sol.id)),
                                  },
                                ])
                              }
                              disabled={atualizando === sol.id}
                            >
                              <Text style={[styles.btnSolTexto, { color: '#FF9800', textAlign: 'center' }]}>{'Não\ncompareceu'}</Text>
                            </TouchableOpacity>
                          </>
                        );
                      })()}
                    </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Ações principais ── */}
        <View style={styles.acoesSection}>

          {/* Motorista: iniciar */}
          {podeIniciar && (
            <Button
              title="Iniciar carona"
              onPress={handleIniciar}
              variant="primary"
              loading={processando}
              style={styles.acaoBtn}
            />
          )}

          {/* Motorista: concluir */}
          {podeConcluir && (
            <Button
              title="Concluir carona"
              onPress={handleConcluir}
              variant="primary"
              loading={processando}
              style={styles.acaoBtn}
            />
          )}

          {/* Motorista: avaliar (carona já concluída) */}
          {isMotorista && carona.status === 'CONCLUIDA' && (
            carona.jaAvaliouPassageiros ? (
              <View style={styles.avaliadoBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.Success} />
                <Text style={styles.avaliadoText}>Passageiros avaliados</Text>
              </View>
            ) : (
              <Button
                title="Avaliar passageiros"
                onPress={abrirAvaliacaoMotorista}
                variant="primary"
                style={styles.acaoBtn}
              />
            )
          )}

          {/* Passageiro: exibe PIN quando aprovado */}
          {!isMotorista && minhaSolicitacao?.status === 'APROVADA' && minhaSolicitacao.pinEmbarque && (
            <View style={styles.pinCard}>
              <View style={styles.pinCardHeader}>
                <Ionicons name="key-outline" size={18} color={Colors.Primary} />
                <Text style={styles.pinCardLabel}>PIN de embarque</Text>
              </View>
              <Text style={styles.pinDigitos}>{minhaSolicitacao.pinEmbarque}</Text>
              <Text style={styles.pinDica}>Mostre este código ao motorista para confirmar sua entrada</Text>
            </View>
          )}

          {/* Passageiro: avaliar motorista */}
          {!isMotorista &&
            (minhaSolicitacao?.status === 'CONCLUIDA' || minhaSolicitacao?.status === 'EMBARCADO') &&
            carona.status === 'CONCLUIDA' && (
            minhaSolicitacao?.jaAvaliouMotorista ? (
              <View style={styles.avaliadoBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.Success} />
                <Text style={styles.avaliadoText}>Motorista avaliado</Text>
              </View>
            ) : (
              <Button
                title="Avaliar motorista"
                onPress={abrirAvaliacaoPassageiro}
                variant="primary"
                style={styles.acaoBtn}
              />
            )
          )}

        </View>

      </ScrollView>

      {/* Modal PIN de embarque */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>Confirmar embarque</Text>
            <Text style={styles.modalSubtitulo}>Digite o código de 4 dígitos exibido no app do passageiro.</Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#CCC"
              autoFocus
            />
            <View style={styles.modalRodape}>
              <TouchableOpacity
                style={styles.cancelarBtn}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.cancelarBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <Button
                title="Confirmar"
                onPress={handleConfirmarEmbarqueComPin}
                variant="primary"
                loading={processando}
                disabled={pinInput.length !== 4}
                style={styles.enviarBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de avaliação */}
      <ModalAvaliacao
        visible={modalAvaliar}
        pessoas={avaliacoes}
        caronaId={caronaId}
        onClose={() => setModalAvaliar(false)}
        onChange={handleMudarAvaliacao}
        onTagToggle={handleToggleTag}
        onEnviar={handleEnviarAvaliacoes}
        enviando={enviandoAvaliacoes}
      />
      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:  { padding: 20 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerIconBtn: { padding: 8, borderRadius: 20 },
  chatBadgeDot: {
    position: 'absolute', top: 5, right: 5,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF6B00', borderWidth: 1.5, borderColor: '#fff',
  },
  backBtn:  { padding: 4 },
  statusBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  caronaTitulo: {
    fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 14,
  },

  enderecoCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    marginBottom: 12, gap: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  rotaItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rotaDotOrigem: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.TextMuted, marginTop: 4, flexShrink: 0,
  },
  rotaDotDestino: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.Primary, marginTop: 4, flexShrink: 0,
  },
  rotaLinha: {
    width: 1, height: 14, backgroundColor: '#DDD',
    marginLeft: 4, marginVertical: 2,
  },
  rotaBairro:  { fontSize: 14, fontWeight: '700', color: Colors.Text },
  rotaEndereco:{ fontSize: 12, color: Colors.TextMuted, marginTop: 1 },

  // Linha de info (3 cards na mesma linha)
  infoRow: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: Colors.Surface, borderRadius: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  infoCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 6, gap: 4,
  },
  infoCardSep: {
    width: 1, backgroundColor: Colors.SurfaceLight, marginVertical: 10,
  },
  infoCardLabel: { fontSize: 10, color: Colors.TextMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoCardValor: { fontSize: 13, fontWeight: '800', color: Colors.Text, textAlign: 'center' },
  infoTileValorSugerido: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  tileIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  valorRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 },
  valorPorPessoa: { fontSize: 16, fontWeight: '800', color: Colors.Primary },
  valorPorPessoaLabel: { fontSize: 12, fontWeight: '500', color: Colors.TextMuted },
  valorTotal: { fontSize: 12, color: Colors.TextMuted, fontWeight: '600' },

  veiculoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  veiculoLabel: { fontSize: 11, color: Colors.TextMuted, fontWeight: '600', marginBottom: 2 },
  veiculoValor: { fontSize: 14, fontWeight: '700', color: Colors.Text },
  placaBadge: {
    borderWidth: 1.5, borderColor: Colors.Primary,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  placaText: { fontSize: 13, fontWeight: '800', color: Colors.Primary, letterSpacing: 1 },

  // Observações
  obsCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  obsTexto: { flex: 1, fontSize: 13, color: Colors.TextMuted, fontStyle: 'italic', lineHeight: 19 },

  // Seção passageiros / minha solic
  secao:       { marginBottom: 16 },
  secaoTitulo: { fontSize: 11, fontWeight: '700', color: Colors.Primary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  vazio:       { color: Colors.TextMuted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

  passageiroCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  passageiroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  passageiroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
  },
  passageiroAvatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  passageiroAvatarImg:  { width: 44, height: 44, borderRadius: 22 },
  passageiroDivider: { height: 1, backgroundColor: Colors.Primary + '15', marginVertical: 12 },
  avatarPendenteDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF6B00',
    borderWidth: 1.5, borderColor: '#fff',
  },
  passageiroNome:     { fontSize: 14, fontWeight: '700', color: Colors.Text },
  passageiroEndereco: { fontSize: 12, color: Colors.TextMuted, marginTop: 2 },
  passageiroMensagem: { fontSize: 13, color: Colors.TextMuted, fontStyle: 'italic', marginBottom: 6 },
  solBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  solBadgeText: { fontSize: 10, fontWeight: '700' },

  pagBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  pagBadgeText: { fontSize: 11, fontWeight: '600' },

  passageiroAcoes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnSol: {
    flex: 1, borderRadius: 20, paddingVertical: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAprovar:      { backgroundColor: Colors.Success },
  btnRecusar:      { backgroundColor: Colors.Error },
  btnRemover:      { borderWidth: 1.5, borderColor: Colors.Error },
  btnNaoCompareceu:{ borderWidth: 1.5, borderColor: '#FF9800' },
  btnSolTexto:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnDisabled:     { opacity: 0.5 },

  // Minha solicitação
  minhaSolicRow: { gap: 8 },

  // Ações
  acoesSection:  { gap: 10, marginTop: 4 },
  acaoBtn:       { minHeight: 48 },
  avaliadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, justifyContent: 'center' },
  avaliadoText:  { fontSize: 14, color: Colors.Success, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.Surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  modalTitulo:   { fontSize: 20, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  modalSubtitulo:{ fontSize: 13, color: Colors.TextMuted, marginBottom: 20, lineHeight: 19 },

  avaliacaoItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SurfaceLight,
    gap: 0,
  },
  avaliacaoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avaliacaoAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
  },
  avaliacaoAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  avaliacaoNome:   { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.Text },
  avaliacaoEnviadaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avaliacaoEnviada:{ fontSize: 13, color: Colors.Success, fontWeight: '600' },

  notaLabel:       { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 12 },
  estrelasRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tagsLabel:       { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 10 },
  tagsContainer:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagsVerMais: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 2,
  },
  tagsVerMaisText: { fontSize: 13, color: Colors.Primary, fontWeight: '600' },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#DDD', backgroundColor: Colors.SurfaceLight,
  },
  tagChipSelecionada: { borderColor: Colors.Primary, backgroundColor: Colors.Primary + '15' },
  tagChipText:         { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },
  tagChipTextSelecionada: { color: Colors.Primary, fontWeight: '600' },
  comentarioLabel: { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 8 },
  avaliacaoInput: {
    backgroundColor: Colors.SurfaceLight, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E0E0E0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.Text, minHeight: 80, marginBottom: 8,
  },

  // PIN embarque — card do passageiro
  pinCard: {
    backgroundColor: Colors.Primary + '0F',
    borderRadius: 16, padding: 18,
    borderWidth: 1.5, borderColor: Colors.Primary + '33',
    alignItems: 'center', gap: 8,
    marginBottom: 4,
  },
  pinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinCardLabel:  { fontSize: 13, fontWeight: '700', color: Colors.Primary },
  pinDigitos: {
    fontSize: 48, fontWeight: '800', color: Colors.Primary,
    letterSpacing: 12,
  },
  pinDica: { fontSize: 12, color: Colors.TextMuted, textAlign: 'center', lineHeight: 17 },

  // PIN embarque — botão do motorista
  btnEmbarcar: {
    borderWidth: 1.5, borderColor: Colors.Primary,
    backgroundColor: Colors.Primary + '0F',
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10,
  },

  // PIN embarque — modal do motorista
  pinModalCard: {
    backgroundColor: Colors.Surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36,
  },
  pinInput: {
    borderWidth: 2, borderColor: Colors.Primary,
    borderRadius: 14, paddingVertical: 14,
    fontSize: 36, fontWeight: '800', color: Colors.Primary,
    textAlign: 'center', letterSpacing: 16,
    marginVertical: 20,
  },

  modalRodape:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  cancelarBtn:  { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD' },
  cancelarBtnText: { fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  enviarBtn:    { flex: 1, minHeight: 46 },
});
