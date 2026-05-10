import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { participanteService } from '@/services/participante.service';
import { useAuthStore } from '@/stores/auth.store';
import { TipoVeiculo } from '@/types/api.types';

// ── FIPE ──────────────────────────────────────────────────────────────────────

interface FipeMarca {
  codigo: string;
  nome: string;
}

interface FipeModelo {
  codigo: number;
  nome: string;
}

const FIPE_TIPO: Record<TipoVeiculo, string> = {
  CARRO: 'carros',
  MOTOCICLETA: 'motos',
  VAN: 'caminhoes',
};

async function fetchMarcas(tipo: TipoVeiculo): Promise<FipeMarca[]> {
  const res = await fetch(
    `https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas`
  );
  if (!res.ok) throw new Error('Erro ao buscar marcas');
  return res.json();
}

async function fetchModelos(
  tipo: TipoVeiculo,
  codigoMarca: string
): Promise<FipeModelo[]> {
  const res = await fetch(
    `https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas/${codigoMarca}/modelos`
  );
  if (!res.ok) throw new Error('Erro ao buscar modelos');
  const data = await res.json();
  return data.modelos ?? [];
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  cnh: z
    .string()
    .length(11, 'CNH deve ter exatamente 11 dígitos')
    .regex(/^\d+$/, 'CNH deve conter apenas números'),
  marca: z.string().min(1, 'Selecione a marca'),
  modelo: z.string().min(1, 'Selecione o modelo'),
  ano: z
    .string()
    .regex(/^\d{4}$/, 'Ano inválido')
    .refine((v) => {
      const n = parseInt(v, 10);
      return n >= 1950 && n <= 2030;
    }, 'Ano deve estar entre 1950 e 2030'),
  cor: z.string().min(1, 'Cor é obrigatória'),
  placa: z
    .string()
    .toUpperCase()
    .regex(
      /^[A-Z]{3}\d[A-Z\d]\d{2}$|^[A-Z]{3}\d{4}$/,
      'Placa inválida (ex: ABC1234 ou ABC1D23)'
    ),
  capacidade: z
    .string()
    .regex(/^\d+$/, 'Inválido')
    .refine((v) => {
      const n = parseInt(v, 10);
      return n >= 1 && n <= 8;
    }, 'Entre 1 e 8 passageiros'),
});

type FormData = z.infer<typeof schema>;

// ── Tipos locais ──────────────────────────────────────────────────────────────

const TIPOS_VEICULO: { value: TipoVeiculo; label: string; icon: string }[] = [
  { value: 'CARRO',       label: 'Carro', icon: '🚗' },
  { value: 'MOTOCICLETA', label: 'Moto',  icon: '🏍️' },
];

// ── Componente picker reutilizado internamente ─────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  titulo: string;
  itens: { codigo: string; nome: string }[];
  loading: boolean;
  onSelect: (item: { codigo: string; nome: string }) => void;
  onClose: () => void;
}

function PickerModal({
  visible,
  titulo,
  itens,
  loading,
  onSelect,
  onClose,
}: PickerModalProps) {
  const [busca, setBusca] = useState('');

  const filtrados = busca.trim()
    ? itens.filter((i) =>
        i.nome.toLowerCase().includes(busca.toLowerCase())
      )
    : itens;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={pickerStyles.safe}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.titulo}>{titulo}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={pickerStyles.fechar}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.searchWrap}>
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor={Colors.TextMuted}
            value={busca}
            onChangeText={setBusca}
            autoFocus
          />
        </View>

        {loading ? (
          <View style={pickerStyles.centered}>
            <ActivityIndicator size="large" color={Colors.Primary} />
          </View>
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item) => item.codigo}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={pickerStyles.item}
                onPress={() => {
                  setBusca('');
                  onSelect(item);
                }}
              >
                <Text style={pickerStyles.itemText}>{item.nome}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={pickerStyles.sep} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.Surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SurfaceLight,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: Colors.Primary },
  fechar: { fontSize: 20, color: Colors.TextMuted, padding: 4 },
  searchWrap: { padding: 12 },
  searchInput: {
    backgroundColor: Colors.InputBg,
    borderRadius: 25,
    paddingHorizontal: 18,
    height: 46,
    fontSize: 15,
    color: Colors.Text,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { paddingHorizontal: 20, paddingVertical: 14 },
  itemText: { fontSize: 15, color: Colors.Text },
  sep: { height: 1, backgroundColor: Colors.SurfaceLight, marginLeft: 20 },
});

// ── Campo estilo Input que abre picker ────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  disabled?: boolean;
  onPress: () => void;
}

function SelectField({
  label,
  value,
  placeholder,
  error,
  disabled,
  onPress,
}: SelectFieldProps) {
  return (
    <View style={sfStyles.container}>
      <Text style={sfStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[sfStyles.field, error ? sfStyles.fieldError : null, disabled && sfStyles.fieldDisabled]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[sfStyles.value, !value && sfStyles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={sfStyles.arrow}>›</Text>
      </TouchableOpacity>
      {error && <Text style={sfStyles.errorText}>{error}</Text>}
    </View>
  );
}

const sfStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.Text, marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.InputBg,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 18,
    height: 50,
  },
  fieldError: { borderColor: Colors.Error },
  fieldDisabled: { opacity: 0.45 },
  value: { flex: 1, fontSize: 15, color: Colors.Text },
  placeholder: { color: Colors.TextMuted },
  arrow: { fontSize: 20, color: Colors.TextMuted },
  errorText: { color: Colors.Error, fontSize: 12, marginTop: 4, marginLeft: 8 },
});

// ── Tela principal ─────────────────────────────────────────────────────────────

export default function PromoverMotoristaScreen() {
  const router = useRouter();
  const { refreshSession } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();

  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>('CARRO');
  const [loading, setLoading] = useState(false);

  // FIPE state
  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState<FipeMarca | null>(null);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [showMarcaPicker, setShowMarcaPicker] = useState(false);
  const [showModeloPicker, setShowModeloPicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cnh: '',
      marca: '',
      modelo: '',
      ano: '',
      cor: '',
      placa: '',
      capacidade: '4',
    },
  });

  // Carrega marcas ao montar e ao trocar tipo de veículo
  useEffect(() => {
    setMarcaSelecionada(null);
    setModelos([]);
    setValue('marca', '');
    setValue('modelo', '');

    setLoadingMarcas(true);
    fetchMarcas(tipoVeiculo)
      .then(setMarcas)
      .catch(() => showAlert('Erro', 'Não foi possível carregar as marcas.'))
      .finally(() => setLoadingMarcas(false));
  }, [tipoVeiculo]);

  const selecionarMarca = async (marca: FipeMarca) => {
    setMarcaSelecionada(marca);
    setValue('marca', marca.nome, { shouldValidate: true });
    setValue('modelo', '');
    setModelos([]);
    setShowMarcaPicker(false);

    setLoadingModelos(true);
    try {
      const lista = await fetchModelos(tipoVeiculo, marca.codigo);
      setModelos(lista);
    } catch {
      showAlert('Erro', 'Não foi possível carregar os modelos.');
    } finally {
      setLoadingModelos(false);
    }
  };

  const selecionarModelo = (modelo: FipeModelo) => {
    setValue('modelo', modelo.nome, { shouldValidate: true });
    setShowModeloPicker(false);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await participanteService.promoverMotorista({
        cnh: data.cnh,
        veiculo: {
          placa: data.placa.toUpperCase(),
          tipo: tipoVeiculo,
          marca: data.marca,
          modelo: data.modelo,
          ano: parseInt(data.ano, 10),
          cor: data.cor,
          capacidade: parseInt(data.capacidade, 10),
        },
      });

      await refreshSession();

      showAlert(
        'Parabéns! 🎉',
        'Seu perfil de motorista foi ativado. Agora você pode criar rotinas e oferecer caronas.',
        [{ text: 'Continuar', onPress: () => router.replace('/perfil') }]
      );
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível promover o perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Virar Motorista</Text>
        <Text style={styles.subtitle}>
          Preencha seus dados de motorista para começar a oferecer caronas.
        </Text>

        {/* CNH */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habilitação</Text>
          <Controller
            control={control}
            name="cnh"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Número da CNH"
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 11))}
                keyboardType="numeric"
                placeholder="12345678901"
                error={errors.cnh?.message}
              />
            )}
          />
        </View>

        {/* Veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veículo</Text>

          {/* Tipo selector */}
          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.tipoRow}>
            {TIPOS_VEICULO.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.tipoBtn,
                  tipoVeiculo === t.value && styles.tipoBtnActive,
                ]}
                onPress={() => setTipoVeiculo(t.value)}
              >
                <Text style={styles.tipoBtnIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.tipoBtnLabel,
                    tipoVeiculo === t.value && styles.tipoBtnLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Marca — picker FIPE */}
          <Controller
            control={control}
            name="marca"
            render={({ field: { value } }) => (
              <SelectField
                label="Marca"
                value={value}
                placeholder={loadingMarcas ? 'Carregando marcas...' : 'Selecione a marca'}
                error={errors.marca?.message}
                disabled={loadingMarcas}
                onPress={() => setShowMarcaPicker(true)}
              />
            )}
          />

          {/* Modelo — picker FIPE */}
          <Controller
            control={control}
            name="modelo"
            render={({ field: { value } }) => (
              <SelectField
                label="Modelo"
                value={value}
                placeholder={
                  !marcaSelecionada
                    ? 'Selecione a marca primeiro'
                    : loadingModelos
                    ? 'Carregando modelos...'
                    : 'Selecione o modelo'
                }
                error={errors.modelo?.message}
                disabled={!marcaSelecionada || loadingModelos}
                onPress={() => setShowModeloPicker(true)}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Controller
                control={control}
                name="ano"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Ano"
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="numeric"
                    placeholder="2020"
                    error={errors.ano?.message}
                  />
                )}
              />
            </View>
            <View style={styles.rowHalf}>
              <Controller
                control={control}
                name="cor"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Cor"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Preto"
                    autoCapitalize="words"
                    error={errors.cor?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLarge}>
              <Controller
                control={control}
                name="placa"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Placa"
                    value={value}
                    onChangeText={(t) => onChange(t.toUpperCase().slice(0, 7))}
                    autoCapitalize="characters"
                    placeholder="ABC1D23"
                    error={errors.placa?.message}
                  />
                )}
              />
            </View>
            <View style={styles.rowSmall}>
              <Controller
                control={control}
                name="capacidade"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Vagas"
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 1))}
                    keyboardType="numeric"
                    placeholder="4"
                    error={errors.capacidade?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.avisoCard}>
          <Text style={styles.avisoText}>
            ⚠️ Após confirmar, seu token de acesso será renovado automaticamente para refletir o perfil de motorista.
          </Text>
        </View>

        <Button
          title="Confirmar e virar motorista"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* Picker de marcas */}
      <PickerModal
        visible={showMarcaPicker}
        titulo="Selecionar Marca"
        itens={marcas}
        loading={loadingMarcas}
        onSelect={selecionarMarca}
        onClose={() => setShowMarcaPicker(false)}
      />

      {/* Picker de modelos */}
      <PickerModal
        visible={showModeloPicker}
        titulo="Selecionar Modelo"
        itens={modelos.map((m) => ({ codigo: String(m.codigo), nome: m.nome }))}
        loading={loadingModelos}
        onSelect={(item) => selecionarModelo({ codigo: Number(item.codigo), nome: item.nome })}
        onClose={() => setShowModeloPicker(false)}
      />
      {alertModal}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll: { padding: 20, paddingBottom: 40 },

  backBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.Primary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.TextMuted, marginBottom: 24, lineHeight: 20 },

  section: {
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.Primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.Text, marginBottom: 8 },
  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(123,47,190,0.2)',
    backgroundColor: Colors.SurfaceLight,
  },
  tipoBtnActive: {
    borderColor: Colors.Primary,
    backgroundColor: Colors.Primary + '12',
  },
  tipoBtnIcon: { fontSize: 22, marginBottom: 4 },
  tipoBtnLabel: { fontSize: 12, color: Colors.TextMuted, fontWeight: '600' },
  tipoBtnLabelActive: { color: Colors.Primary },

  row: { flexDirection: 'row', gap: 12 },
  rowHalf: { flex: 1 },
  rowLarge: { flex: 2 },
  rowSmall: { flex: 1 },

  avisoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  avisoText: { fontSize: 13, color: '#795548', lineHeight: 18 },

  submitBtn: { minHeight: 52 },
});
