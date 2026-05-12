import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TimePicker } from '@/components/ui/TimePicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { rotinaService } from '@/services/rotina.service';
import { DiaSemana } from '@/types/api.types';

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
  { key: 'DOM', label: 'Dom' },
];

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nome:        z.string().min(2, 'Mínimo 2 caracteres').max(60).optional().or(z.literal('')),
  horarioSaida:z.string().min(5, 'Selecione o horário').optional().or(z.literal('')),
  observacoes: z.string().max(300).optional(),
  pixKey:      z.string().max(150).optional(),
});

type FormData = z.infer<typeof schema>;

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function EditarRotinaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert, alertModal } = useAppAlert();

  const [carregando, setCarregando] = useState(true);
  const [loading, setLoading]       = useState(false);

  const [diasSelecionados, setDiasSelecionados] = useState<DiaSemana[]>([]);
  const [raio, setRaio]                         = useState(2.0);
  const [horarioPickerVisible, setHorarioPickerVisible] = useState(false);
  const [horarioDate, setHorarioDate] = useState(new Date(2000, 0, 1, 6, 0));

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', horarioSaida: '', observacoes: '', pixKey: '' },
  });

  const horarioSaida = watch('horarioSaida');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const rotinas = await rotinaService.listar();
        const rotina = rotinas.find((r) => r.id === Number(id));
        if (!rotina) {
          showAlert('Erro', 'Rotina não encontrada.');
          router.back();
          return;
        }
        setValue('nome', rotina.nome ?? '');
        setValue('horarioSaida', rotina.horarioSaida.slice(0, 5));
        setValue('observacoes', rotina.observacoes ?? '');
        setValue('pixKey', rotina.pixKey ?? '');
        setDiasSelecionados([...rotina.diasDaSemana]);
        setRaio(rotina.raioAceito ?? 2.0);
        if (rotina.horarioSaida) {
          const [h, m] = rotina.horarioSaida.split(':').map(Number);
          const d = new Date(2000, 0, 1, h, m);
          setHorarioDate(d);
        }
      } catch {
        showAlert('Erro', 'Não foi possível carregar a rotina.');
        router.back();
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  const toggleDia = (dia: DiaSemana) =>
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );

  const onSubmit = async (data: FormData) => {
    if (diasSelecionados.length === 0) {
      showAlert('Atenção', 'Selecione ao menos um dia da semana.');
      return;
    }
    if (!data.horarioSaida) {
      showAlert('Atenção', 'Selecione o horário de saída.');
      return;
    }

    // RN13 — nome único por motorista (exclui a própria rotina)
    if (data.nome?.trim()) {
      try {
        const existentes = await rotinaService.listar();
        const nomeNovo = data.nome.trim().toLowerCase();
        const duplicado = existentes.some(r => r.id !== Number(id) && (r.nome ?? '').toLowerCase() === nomeNovo);
        if (duplicado) {
          showAlert('Nome já em uso', `Você já tem uma rotina chamada "${data.nome.trim()}". Escolha um nome diferente.`);
          return;
        }
      } catch { /* ignora falha; backend também valida */ }
    }

    setLoading(true);
    try {
      await rotinaService.atualizar(Number(id), {
        nome:          data.nome?.trim() || undefined,
        horarioSaida:  data.horarioSaida,
        diasDaSemana:  diasSelecionados,
        raioAceito:    raio,
        observacoes:   data.observacoes?.trim() || undefined,
        pixKey:        data.pixKey?.trim() || undefined,
      });
      showAlert('Rotina atualizada!', 'As alterações foram salvas.', [
        { text: 'Ok', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.Primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Rotina</Text>
          <Text style={styles.subtitle}>
            Apenas agendamento e preferências podem ser alterados.
          </Text>
        </View>

        {/* ── Seção: Nome ──────────────────────────────────────────────────────── */}
        <View style={styles.secaoCard}>
          <View style={styles.secaoHeaderRow}>
            <Text style={styles.secaoTitulo}>Identificação</Text>
          </View>
          <Controller control={control} name="nome" render={({ field: { value, onChange } }) => (
            <Input
              label="Nome da rotina"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder='Ex: "Faculdade pela manhã"'
              autoCapitalize="words"
              error={errors.nome?.message}
            />
          )} />
        </View>

        {/* ── Seção: Agenda ────────────────────────────────────────────────────── */}
        <View style={styles.secaoCard}>
          <View style={styles.secaoHeaderRow}>
            <Text style={styles.secaoTitulo}>Agenda</Text>
          </View>

          <Text style={styles.sectionLabel}>Dias da semana</Text>
          <View style={styles.diasRow}>
            {DIAS.map((dia) => {
              const sel = diasSelecionados.includes(dia.key);
              return (
                <TouchableOpacity
                  key={dia.key}
                  onPress={() => toggleDia(dia.key)}
                  style={[styles.diaChip, sel && styles.diaChipSel]}
                >
                  <Text style={[styles.diaText, sel && styles.diaTextSel]}>{dia.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Controller control={control} name="horarioSaida" render={({ field: { onChange } }) => (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionLabel}>Horário de saída</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, !!errors.horarioSaida && styles.pickerBtnError]}
                onPress={() => setHorarioPickerVisible(true)}
              >
                <View style={styles.pickerBtnContent}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={horarioSaida ? Colors.Text : Colors.TextMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.pickerBtnText, !horarioSaida && styles.pickerBtnPlaceholder]}>
                    {horarioSaida || 'Selecionar horário'}
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.horarioSaida && (
                <Text style={styles.fieldError}>{errors.horarioSaida.message}</Text>
              )}
              <TimePicker
                visible={horarioPickerVisible}
                value={horarioDate}
                onConfirm={(date) => {
                  const h = String(date.getHours()).padStart(2, '0');
                  const m = String(date.getMinutes()).padStart(2, '0');
                  setHorarioDate(date);
                  onChange(`${h}:${m}`);
                }}
                onClose={() => setHorarioPickerVisible(false)}
              />
            </View>
          )} />

          {/* Raio de alcance */}
          <Text style={styles.sectionLabel}>Raio de alcance</Text>
          <View style={styles.raioRow}>
            <TouchableOpacity
              style={[styles.raioBtn, raio <= 0.5 && styles.raioBtnDis]}
              onPress={() => setRaio((r) => Math.max(0.5, parseFloat((r - 0.5).toFixed(1))))}
              disabled={raio <= 0.5}
            >
              <Text style={styles.raioBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.raioValorWrap}>
              <Text style={styles.raioValor}>{raio.toFixed(1)}</Text>
              <Text style={styles.raioKm}>km</Text>
            </View>
            <TouchableOpacity
              style={[styles.raioBtn, raio >= 10 && styles.raioBtnDis]}
              onPress={() => setRaio((r) => Math.min(10, parseFloat((r + 0.5).toFixed(1))))}
              disabled={raio >= 10}
            >
              <Text style={styles.raioBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.raioHint}>
            Máximo que você aceita se desviar do trajeto para buscar passageiros.
          </Text>
        </View>

        {/* ── Seção: Observações ───────────────────────────────────────────────── */}
        <View style={styles.secaoCard}>
          <View style={styles.secaoHeaderRow}>
            <Text style={styles.secaoTitulo}>Observações</Text>
          </View>
          <Controller control={control} name="observacoes" render={({ field: { value, onChange } }) => (
            <Input
              label="Observações (opcional)"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder='Ex: "Pego no portão principal"'
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              error={errors.observacoes?.message}
            />
          )} />
        </View>

        {/* ── Seção: Pagamento ─────────────────────────────────────────────────── */}
        <View style={styles.secaoCard}>
          <View style={styles.secaoHeaderRow}>
            <Text style={styles.secaoTitulo}>Pagamento</Text>
          </View>
          <Text style={styles.secaoSubtitulo}>
            Informe sua chave PIX para facilitar o recebimento dos passageiros.
          </Text>
          <Controller control={control} name="pixKey" render={({ field: { value, onChange } }) => (
            <Input
              label="Chave PIX (opcional)"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="CPF, e-mail ou chave aleatória"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.pixKey?.message}
            />
          )} />
        </View>

        <Button
          title="Salvar alterações"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:   { flex: 1 },
  content:  { padding: 20, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:   { marginBottom: 20 },
  backBtn:  { padding: 4 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.TextMuted },

  secaoCard: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  secaoHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  secaoTitulo:   { fontSize: 15, fontWeight: '800', color: Colors.Primary },
  secaoSubtitulo:{ fontSize: 13, color: Colors.TextMuted, marginTop: 4, marginBottom: 12 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.Text, marginBottom: 10 },

  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  diaChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.Primary + '55',
    backgroundColor: Colors.SurfaceLight,
  },
  diaChipSel: { backgroundColor: Colors.Primary, borderColor: Colors.Primary },
  diaText:    { fontSize: 13, fontWeight: '600', color: Colors.Primary },
  diaTextSel: { color: '#fff' },

  pickerBtn: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.SurfaceLight,
  },
  pickerBtnError:       { borderColor: Colors.Error },
  pickerBtnContent:     { flexDirection: 'row', alignItems: 'center' },
  pickerBtnText:        { fontSize: 14, color: Colors.Text, fontWeight: '500' },
  pickerBtnPlaceholder: { color: Colors.TextMuted },
  fieldError:           { fontSize: 12, color: Colors.Error, marginTop: 4 },

  raioRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  raioBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
  },
  raioBtnDis: { backgroundColor: Colors.TextMuted + '44' },
  raioBtnText:{ fontSize: 22, color: '#fff', fontWeight: '700', lineHeight: 26 },
  raioValorWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  raioValor:  { fontSize: 28, fontWeight: '800', color: Colors.Text },
  raioKm:     { fontSize: 14, color: Colors.TextMuted, fontWeight: '600' },
  raioHint:   { fontSize: 12, color: Colors.TextMuted, marginBottom: 4 },

  submitBtn: { minHeight: 52, marginTop: 4 },
});
