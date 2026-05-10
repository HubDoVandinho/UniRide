import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { TimePicker } from '@/components/ui/TimePicker';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { CaronaResponse } from '@/types/api.types';
import { BottomSheet } from '@/components/ui/BottomSheet';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }
function isoParaBR(iso: string): string { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

function formatarData(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const isoHoje = hoje.toISOString().split('T')[0];
  const isoAmanha = amanha.toISOString().split('T')[0];
  if (iso === isoHoje) return 'Hoje';
  if (iso === isoAmanha) return 'Amanhã';
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${diasSemana[d.getDay()]}, ${day} ${meses[month - 1]}`;
}

const STATUS_COLOR: Record<string, string> = {
  AGENDADA: '#FF9800', EM_ANDAMENTO: '#2196F3', CONCLUIDA: '#4CAF50', CANCELADA: '#9E9E9E',
};

// ── Telas de estado ───────────────────────────────────────────────────────────

function VirarMotoristaScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centeredContainer}>
        <Ionicons name="car" size={72} color={Colors.Primary} style={{ marginBottom: 20 }} />
        <Text style={styles.virarTitulo}>Ofereça caronas</Text>
        <Text style={styles.virarSubtitulo}>
          Apenas motoristas podem oferecer caronas. Registre seu veículo e CNH para liberar este recurso.
        </Text>
        <Button
          title="Virar Motorista"
          onPress={() => router.push('/perfil/promover-motorista')}
          variant="primary"
          style={styles.virarBtn}
        />
        <TouchableOpacity onPress={() => router.push('/solicitar')}>
          <Text style={styles.virarLink}>Prefiro solicitar uma carona →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function CnhEmAnaliseScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centeredContainer}>
        <Text style={styles.virarIcon}>⏳</Text>
        <Text style={styles.virarTitulo}>CNH em análise</Text>
        <Text style={styles.virarSubtitulo}>
          Seus dados foram recebidos e sua CNH está sendo verificada pela equipe UniRide.{'\n\n'}
          Você poderá criar rotinas e oferecer caronas assim que a aprovação for concluída.
        </Text>
        <TouchableOpacity onPress={() => router.push('/solicitar')}>
          <Text style={styles.virarLink}>Solicitar uma carona enquanto isso →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Tela do motorista ─────────────────────────────────────────────────────────

function MotoristaOfereceScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const { caronasComPendentes, marcarCaronaVista, caronasComMensagemNova } = useNotificationStore();
  const [caronas, setCaronas] = useState<CaronaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroModalVisible, setFiltroModalVisible] = useState(false);
  const [filtroData, setFiltroData] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState(new Date());

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      setCaronas(await caronaService.listarMinhasProximas());
    } catch {
      showAlert('Erro', 'Não foi possível carregar as caronas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarDados(); }, [carregarDados]));

  // ── Polling 30s ────────────────────────────────────────────────────────────

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSilencioso = useCallback(async () => {
    try { setCaronas(await caronaService.listarMinhasProximas()); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(refreshSilencioso, 5_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollingRef.current = setInterval(refreshSilencioso, 5_000);
      } else {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    });
    return () => {
      sub.remove();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refreshSilencioso]);

  const caronasFiltradas = [...caronas]
    .sort((a, b) => {
      const da = typeof a.data === 'string' ? a.data : String(a.data);
      const db = typeof b.data === 'string' ? b.data : String(b.data);
      return da !== db ? da.localeCompare(db) : a.horarioSaida.localeCompare(b.horarioSaida);
    })
    .filter((c) => {
      const iso = typeof c.data === 'string' ? c.data : String(c.data);
      if (filtroData && iso !== filtroData) return false;
      if (filtroHora && !c.horarioSaida.startsWith(filtroHora)) return false;
      return true;
    });

  const filtrosAtivos = (filtroData ? 1 : 0) + (filtroHora ? 1 : 0);

  const limparFiltros = () => { setFiltroData(''); setFiltroHora(''); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Oferecer Carona</Text>
          <Text style={styles.screenSubtitle}>Suas próximas caronas agendadas.</Text>
        </View>
        <TouchableOpacity
          style={[styles.filtroBtn, filtrosAtivos > 0 && styles.filtroBtnAtivo]}
          onPress={() => setFiltroModalVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={14}
            color={filtrosAtivos > 0 ? '#fff' : Colors.TextMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filtroBtnText, filtrosAtivos > 0 && styles.filtroBtnTextAtivo]}>
            {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : 'Filtros'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      ) : caronas.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nenhuma carona agendada</Text>
          <Text style={styles.emptySubtitle}>
            Acesse suas rotinas para gerar caronas no calendário.
          </Text>
          <TouchableOpacity
            style={styles.perfilBtn}
            onPress={() => router.push('/perfil/corridas')}
          >
            <Text style={styles.perfilBtnText}>Ir para Minhas Rotinas</Text>
          </TouchableOpacity>
        </View>
      ) : caronasFiltradas.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={Colors.Primary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptySubtitle}>Nenhuma carona corresponde aos filtros aplicados.</Text>
          <TouchableOpacity style={styles.perfilBtn} onPress={limparFiltros}>
            <Text style={styles.perfilBtnText}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={caronasFiltradas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={carregarDados}
          refreshing={loading}
          renderItem={({ item }) => {
            const iso = typeof item.data === 'string' ? item.data : String(item.data);
            const cor = STATUS_COLOR[item.status] ?? '#9E9E9E';
            const temPendente = caronasComPendentes.includes(item.id);
            const temMensagem = caronasComMensagemNova.includes(item.id);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  if (temPendente) marcarCaronaVista(item.id);
                  router.push({ pathname: '/caronas/[id]', params: { id: item.id } });
                }}
                activeOpacity={0.75}
              >
                {/* Cabeçalho do card: data + badge status + dots + chevron */}
                <View style={styles.cardMeta}>
                  <View style={styles.dataBadge}>
                    <Text style={styles.dataText}>{formatarData(iso)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.statusBadge, { backgroundColor: cor + '22', borderColor: cor }]}>
                      <Text style={[styles.statusBadgeText, { color: cor }]}>{item.status}</Text>
                    </View>
                    <View style={{ position: 'relative' }}>
                      <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
                      {(temPendente || temMensagem) && (
                        <View style={[styles.pendenteDot, { position: 'absolute', top: -4, right: -4 }]} />
                      )}
                    </View>
                  </View>
                </View>

                {/* Nome da carona */}
                <Text style={styles.cardNome} numberOfLines={1}>
                  {item.nome ?? `${pontoRota(item.origem)} → ${pontoRota(item.destino)}`}
                </Text>

                {/* Rota */}
                <Text style={styles.cardRota} numberOfLines={1}>
                  {pontoRota(item.origem)} → {pontoRota(item.destino)}
                </Text>

                {/* Detalhes: horário + vagas */}
                <View style={styles.detalhesRow}>
                  <View style={styles.detalhePair}>
                    <Ionicons name="time-outline" size={13} color={Colors.TextMuted} />
                    <Text style={styles.detalhe}>{item.horarioSaida.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.detalhePair}>
                    <Ionicons name="people-outline" size={13} color={Colors.TextMuted} />
                    <Text style={styles.detalhe}>
                      {item.vagasDisponiveis}/{item.vagasTotal} vagas
                    </Text>
                  </View>
                </View>

                {(item.veiculoMarca || item.veiculoModelo || item.veiculoTipo) && (
                  <View style={[styles.detalhePair, { marginBottom: 4 }]}>
                    <Ionicons name="car-outline" size={13} color={Colors.TextMuted} />
                    <Text style={styles.detalhe}>
                      {[item.veiculoMarca, item.veiculoModelo, item.veiculoTipo].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}

                {/* Valor — sempre último item */}
                {item.valorSugerido != null && (
                  <View style={styles.valorChip}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="cash-outline" size={14} color={Colors.Primary} />
                      <Text style={styles.valorChipText}>
                        R$ {item.valorSugerido.toFixed(2)}
                        <Text style={styles.valorChipLabel}> /integrante</Text>
                      </Text>
                    </View>
                    {item.custoTotal != null && (
                      <Text style={styles.valorTotal}>Total: R$ {item.custoTotal.toFixed(2)}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {alertModal}

      {/* BottomSheet filtros */}
      <BottomSheet visible={filtroModalVisible} onClose={() => setFiltroModalVisible(false)}>
        <Text style={styles.modalTitulo}>Filtrar caronas</Text>

        <Text style={styles.filterLabel}>Data</Text>
        <TouchableOpacity style={styles.filterInput} onPress={() => setCalendarVisible(true)}>
          <Text style={filtroData ? styles.filterInputText : styles.filterInputPlaceholder}>
            {filtroData ? isoParaBR(filtroData) : 'Selecionar data'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={Colors.TextMuted} />
        </TouchableOpacity>
        {calendarVisible && (
          <View style={styles.calendarWrap}>
            <Calendar
              onDayPress={(day: { dateString: string }) => {
                setFiltroData(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={filtroData ? { [filtroData]: { selected: true, selectedColor: Colors.Primary } } : {}}
              theme={{ todayTextColor: Colors.Primary, arrowColor: Colors.Primary, selectedDayBackgroundColor: Colors.Primary }}
            />
          </View>
        )}

        <Text style={styles.filterLabel}>Horário</Text>
        <TouchableOpacity style={styles.filterInput} onPress={() => setTimePickerVisible(true)}>
          <Text style={filtroHora ? styles.filterInputText : styles.filterInputPlaceholder}>
            {filtroHora ? filtroHora : 'Selecionar horário'}
          </Text>
          <Ionicons name="time-outline" size={18} color={Colors.TextMuted} />
        </TouchableOpacity>
        <TimePicker
          visible={timePickerVisible}
          value={timePickerValue}
          title="Filtrar por horário"
          onConfirm={(date) => {
            setTimePickerValue(date);
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            setFiltroHora(`${h}:${m}`);
          }}
          onClose={() => setTimePickerVisible(false)}
        />

        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.btnLimpar} onPress={() => { limparFiltros(); setFiltroModalVisible(false); }}>
            <Text style={styles.btnLimparText}>Limpar</Text>
          </TouchableOpacity>
          <Button title="Aplicar" onPress={() => setFiltroModalVisible(false)} variant="primary" style={styles.btnAplicar} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Raiz ──────────────────────────────────────────────────────────────────────

export default function OfereceScreen() {
  const { user } = useAuthStore();
  if (user?.tipo !== 'MOTORISTA') return <VirarMotoristaScreen />;
  if (!user.aprovadoAdmin) return <CnhEmAnaliseScreen />;
  return <MotoristaOfereceScreen />;
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },

  // Telas de estado (virar motorista / CNH)
  centeredContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36,
  },
  virarIcon:     { fontSize: 72, marginBottom: 20 },
  virarTitulo:   { fontSize: 24, fontWeight: '800', color: Colors.Primary, textAlign: 'center', marginBottom: 12 },
  virarSubtitulo:{ fontSize: 15, color: Colors.TextMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  virarBtn:      { width: '100%', minHeight: 50, marginBottom: 16 },
  virarLink:     { fontSize: 14, color: Colors.Primary, fontWeight: '600' },

  // Header
  screenHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  screenTitle:   { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 2 },
  screenSubtitle:{ fontSize: 13, color: Colors.TextMuted },
  pendenteDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF6B00',
    borderWidth: 1.5, borderColor: '#fff',
  },
  filtroBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.TextMuted,
  },
  filtroBtnAtivo: { backgroundColor: Colors.Primary, borderColor: Colors.Primary },
  filtroBtnText:  { fontSize: 13, fontWeight: '600', color: Colors.TextMuted },
  filtroBtnTextAtivo: { color: '#fff' },

  // Estados
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: Colors.TextMuted, marginBottom: 8, textAlign: 'center' },
  emptySubtitle:{ fontSize: 13, color: Colors.TextMuted, textAlign: 'center', marginBottom: 20 },
  perfilBtn:    { backgroundColor: Colors.Primary, borderRadius: 25, paddingHorizontal: 24, paddingVertical: 12 },
  perfilBtnText:{ color: Colors.TextLight, fontSize: 15, fontWeight: '700' },

  // Cards (estilo solicitar.tsx)
  list: { gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  dataBadge: {
    backgroundColor: Colors.Primary + '15', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  dataText:       { fontSize: 12, fontWeight: '700', color: Colors.Primary },
  statusBadge:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusBadgeText:{ fontSize: 10, fontWeight: '700' },
  cardNome:  { fontSize: 15, fontWeight: '700', color: Colors.Text, marginBottom: 2 },
  cardRota:  { fontSize: 13, color: Colors.TextMuted, marginBottom: 8 },
  detalhesRow:  { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 4 },
  detalhePair:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detalhe:      { fontSize: 12, color: Colors.TextMuted },
  valorChip:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 10, backgroundColor: Colors.Primary + '12', borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 6 },
  valorChipText:  { fontSize: 13, fontWeight: '700', color: Colors.Primary },
  valorChipLabel: { fontSize: 11, fontWeight: '500', color: Colors.Primary },
  valorTotal:     { fontSize: 11, color: Colors.TextMuted },

  // Modal filtros
  modalTitulo:  { fontSize: 18, fontWeight: '800', color: Colors.Text, marginBottom: 20, textAlign: 'center' },
  filterLabel:  { fontSize: 13, fontWeight: '600', color: Colors.Text, marginBottom: 6 },
  filterInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 16, backgroundColor: Colors.SurfaceLight,
  },
  filterInputText:        { fontSize: 15, color: Colors.Text, flex: 1 },
  filterInputPlaceholder: { fontSize: 15, color: '#999', flex: 1 },
  calendarWrap: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: '#ddd' },
  modalBtns:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  btnLimpar:    { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD' },
  btnLimparText:{ fontSize: 14, fontWeight: '600', color: Colors.TextMuted },
  btnAplicar:   { flex: 1, minHeight: 46 },
});
