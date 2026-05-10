import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { caronaService } from '@/services/carona.service';
import { CaronaResponse } from '@/types/api.types';

function pontoRota(s: string): string { return s.split(' — ')[0].trim(); }
function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

type MarkedDates = Record<string, {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
}>;

export default function AgendaMotoristaScreen() {
  const router = useRouter();
  const { motoristaId, motoristaNome } = useLocalSearchParams<{
    motoristaId: string;
    motoristaNome: string;
  }>();

  const { showAlert, alertModal } = useAppAlert();
  const [caronas, setCaronas] = useState<CaronaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [caronasDoDia, setCaronasDoDia] = useState<CaronaResponse[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().split('T')[0]);
  const [solicitando, setSolicitando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!motoristaId) return;
    setLoading(true);
    try {
      const lista = await caronaService.listarDeMotorista(Number(motoristaId));
      setCaronas(lista);

      const today = new Date().toISOString().split('T')[0];

      const marked: MarkedDates = {};
      lista.forEach((c) => {
        const iso = typeof c.data === 'string' ? c.data : String(c.data);
        if (!marked[iso]) marked[iso] = { marked: true, dotColor: Colors.Primary };
      });

      // Seleciona automaticamente a carona mais próxima da data atual
      const maisProxima = lista
        .map((c) => (typeof c.data === 'string' ? c.data : String(c.data)))
        .filter((d) => d >= today)
        .sort()[0] ?? null;

      if (maisProxima) {
        marked[maisProxima] = { ...marked[maisProxima], selected: true, selectedColor: Colors.Primary };
        setCurrentMonth(maisProxima);
        setDataSelecionada(maisProxima);
        setCaronasDoDia(lista.filter((c) => {
          const d = typeof c.data === 'string' ? c.data : String(c.data);
          return d === maisProxima;
        }));
      }

      setMarkedDates(marked);
    } catch {
      showAlert('Erro', 'Não foi possível carregar a agenda deste motorista.');
    } finally {
      setLoading(false);
    }
  }, [motoristaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleDayPress = (day: { dateString: string }) => {
    const iso = day.dateString;
    const dodia = caronas.filter((c) => {
      const d = typeof c.data === 'string' ? c.data : String(c.data);
      return d === iso;
    });

    setMarkedDates((prev) => {
      const next: MarkedDates = {};
      Object.entries(prev).forEach(([k, v]) => {
        next[k] = { marked: v.marked, dotColor: v.dotColor };
      });
      if (dodia.length > 0) next[iso] = { ...next[iso], selected: true, selectedColor: Colors.Primary };
      return next;
    });

    setDataSelecionada(dodia.length > 0 ? iso : null);
    setCaronasDoDia(dodia);
  };

  const solicitarVaga = async (carona: CaronaResponse) => {
    setSolicitando(carona.id);
    try {
      await caronaService.solicitarVaga(carona.id);
      showAlert('Solicitação enviada!', 'Acompanhe o status em "Minhas solicitações".');
      await carregar();
      setCaronasDoDia([]);
      setDataSelecionada(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Não foi possível solicitar a carona.';
      showAlert('Erro', msg);
    } finally {
      setSolicitando(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
          <Text style={styles.loadingText}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{motoristaNome ?? 'Motorista'}</Text>
          <Text style={styles.subtitle}>
            {caronas.length === 0
              ? 'Nenhuma carona agendada ainda.'
              : `${caronas.length} carona(s) disponível(is) — toque em uma data roxa para ver detalhes.`}
          </Text>
        </View>

        {/* Calendário ou empty state */}
        {caronas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={Colors.Primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhuma carona agendada</Text>
            <Text style={styles.emptyDesc}>Este motorista ainda não possui caronas disponíveis.</Text>
          </View>
        ) : (
          <>
            <View style={styles.calendarWrapper}>
              <Calendar
                current={currentMonth}
                minDate={new Date().toISOString().split('T')[0]}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={{
                  selectedDayBackgroundColor: Colors.Primary,
                  selectedDayTextColor: '#fff',
                  todayTextColor: Colors.Primary,
                  dotColor: Colors.Primary,
                  selectedDotColor: '#fff',
                  arrowColor: Colors.Primary,
                  monthTextColor: Colors.Primary,
                  textDayFontWeight: '600',
                  textMonthFontWeight: '800',
                  textDayHeaderFontWeight: '600',
                  calendarBackground: Colors.Surface,
                }}
                style={styles.calendar}
              />
            </View>

            {/* Legenda */}
            <View style={styles.legendaRow}>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaDot, { backgroundColor: Colors.Primary }]} />
            <Text style={styles.legendaText}>Carona disponível</Text>
          </View>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaDot, { backgroundColor: Colors.Primary, opacity: 0.4 }]} />
            <Text style={styles.legendaText}>Selecionada</Text>
          </View>
        </View>

        {/* Cards das caronas do dia */}
        {caronasDoDia.map((c) => {
          const iso = typeof c.data === 'string' ? c.data : String(c.data);
          return (
            <View key={c.id} style={styles.card}>
              {/* Meta: data + direção */}
              <View style={styles.cardMeta}>
                <View style={styles.dataBadge}>
                  <Text style={styles.dataText}>{formatarData(iso)}</Text>
                </View>
              </View>

              {c.nome && <Text style={styles.caronaNome}>{c.nome}</Text>}
              <Text style={styles.rota}>{pontoRota(c.origem)} → {pontoRota(c.destino)}</Text>

              <View style={styles.detalhesRow}>
                <View style={styles.detalhePair}>
                  <Ionicons name="time-outline" size={13} color={Colors.TextMuted} />
                  <Text style={styles.detalhe}>{c.horarioSaida.slice(0, 5)}</Text>
                </View>
                <View style={styles.detalhePair}>
                  <Ionicons name="people-outline" size={13} color={Colors.TextMuted} />
                  <Text style={styles.detalhe}>{c.vagasDisponiveis} vaga{c.vagasDisponiveis !== 1 ? 's' : ''}</Text>
                </View>
              </View>

              {(c.veiculoMarca || c.veiculoModelo || c.veiculoTipo) && (
                <View style={[styles.detalhePair, { marginBottom: 14 }]}>
                  <Ionicons name="car-outline" size={13} color={Colors.TextMuted} />
                  <Text style={styles.detalhe}>
                    {[c.veiculoMarca, c.veiculoModelo, c.veiculoTipo].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}

              {c.valorSugerido != null && (
                <View style={styles.valorChip}>
                  <Ionicons name="cash-outline" size={14} color={Colors.Primary} />
                  <Text style={styles.valorChipText}>
                    R$ {c.valorSugerido.toFixed(2)}
                    <Text style={styles.valorChipLabel}> /pessoa se você entrar</Text>
                  </Text>
                </View>
              )}

              {c.observacoes && (
                <Text style={styles.panelObs}>"{c.observacoes}"</Text>
              )}

              <Button
                title={c.vagasDisponiveis === 0 ? 'Sem vagas' : 'Solicitar vaga'}
                onPress={() => solicitarVaga(c)}
                variant="primary"
                loading={solicitando === c.id}
                disabled={c.vagasDisponiveis === 0 || solicitando !== null}
                style={styles.solicitarBtn}
              />
            </View>
          );
        })}
          </>
        )}

      </ScrollView>
      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:      { flexGrow: 1, padding: 20, gap: 12 },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.TextMuted, marginTop: 12, fontSize: 14 },
  header:      { marginBottom: 8 },
  backBtn:     { padding: 4 },
  title:       { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  subtitle:    { fontSize: 13, color: Colors.TextMuted },
  calendarWrapper: {
    borderRadius: 16, overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  calendar: { borderRadius: 16 },
  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 6 },
  emptyDesc:   { fontSize: 13, color: Colors.TextMuted, textAlign: 'center', lineHeight: 19 },

  legendaRow:  { flexDirection: 'row', gap: 20 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaDot:  { width: 10, height: 10, borderRadius: 5 },
  legendaText: { fontSize: 12, color: Colors.TextMuted },

  // ── Card — idêntico ao de solicitar ──────────────────
  card: {
    backgroundColor: Colors.Surface, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dataBadge:   { backgroundColor: Colors.Primary + '18', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  dataText:    { color: Colors.Primary, fontSize: 12, fontWeight: '700' },
  caronaNome:  { fontSize: 14, fontWeight: '700', color: Colors.Primary, marginBottom: 2 },
  rota:        { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 8 },
  detalhesRow: { flexDirection: 'row', gap: 14, marginBottom: 6, flexWrap: 'wrap' },
  detalhePair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detalhe:     { fontSize: 13, color: Colors.TextMuted, fontWeight: '500' },
  valorChip:      { flexDirection: 'row', gap: 6, marginBottom: 14,
                    backgroundColor: Colors.Primary + '12', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  valorChipText:  { fontSize: 13, fontWeight: '700', color: Colors.Primary },
  valorChipLabel: { fontSize: 11, fontWeight: '500', color: Colors.Primary },
  valorChipNota:  { fontSize: 11, color: Colors.TextMuted, marginTop: 1 },
  panelObs:    { fontSize: 13, fontStyle: 'italic', color: Colors.TextMuted, marginBottom: 12 },
  solicitarBtn: { minHeight: 44, paddingVertical: 10 },
});
