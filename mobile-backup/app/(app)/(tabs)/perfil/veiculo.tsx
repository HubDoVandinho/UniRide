import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { participanteService } from '@/services/participante.service';
import { useAuthStore } from '@/stores/auth.store';
import { TipoVeiculo, VeiculoResponse } from '@/types/api.types';

// ── FIPE ──────────────────────────────────────────────────────────────────────

interface FipeMarca { codigo: string; nome: string; }
interface FipeModelo { codigo: number; nome: string; }

const FIPE_TIPO: Record<TipoVeiculo, string> = {
  CARRO: 'carros',
  MOTOCICLETA: 'motos',
  VAN: 'caminhoes',
};

async function fetchMarcas(tipo: TipoVeiculo): Promise<FipeMarca[]> {
  const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas`);
  if (!res.ok) throw new Error('Erro ao buscar marcas');
  return res.json();
}

async function fetchModelos(tipo: TipoVeiculo, codigoMarca: string): Promise<FipeModelo[]> {
  const res = await fetch(
    `https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas/${codigoMarca}/modelos`
  );
  if (!res.ok) throw new Error('Erro ao buscar modelos');
  const data = await res.json();
  return data.modelos ?? [];
}

// ── Schema ────────────────────────────────────────────────────────────────────

// Capacidade fixa por tipo: Carro=4, Moto=1
const CAPACIDADE_POR_TIPO: Record<TipoVeiculo, number> = {
  CARRO: 4,
  MOTOCICLETA: 1,
  VAN: 8,
};

const schema = z.object({
  marca:  z.string().min(1, 'Selecione a marca'),
  modelo: z.string().min(1, 'Selecione o modelo'),
  ano:    z.string().regex(/^\d{4}$/, 'Ano inválido').refine((v) => {
    const n = parseInt(v, 10);
    return n >= 1950 && n <= 2030;
  }, 'Ano entre 1950 e 2030'),
  cor:    z.string().min(1, 'Cor é obrigatória'),
  placa:  z.string().toUpperCase().regex(
    /^[A-Z]{3}\d[A-Z\d]\d{2}$|^[A-Z]{3}\d{4}$/,
    'Placa inválida (ex: ABC1234 ou ABC1D23)'
  ),
});

type FormData = z.infer<typeof schema>;

const TIPOS_VEICULO: { value: TipoVeiculo; label: string }[] = [
  { value: 'CARRO',       label: 'Carro' },
  { value: 'MOTOCICLETA', label: 'Moto'  },
];

// ── PickerModal ───────────────────────────────────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  titulo: string;
  itens: { codigo: string; nome: string }[];
  loading: boolean;
  onSelect: (item: { codigo: string; nome: string }) => void;
  onClose: () => void;
}

function PickerModal({ visible, titulo, itens, loading, onSelect, onClose }: PickerModalProps) {
  const [busca, setBusca] = useState('');
  const filtrados = busca.trim()
    ? itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))
    : itens;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pStyles.safe}>
        <View style={pStyles.header}>
          <Text style={pStyles.titulo}>{titulo}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={pStyles.fechar}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={pStyles.searchWrap}>
          <TextInput
            style={pStyles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor={Colors.TextMuted}
            value={busca}
            onChangeText={setBusca}
            autoFocus
          />
        </View>
        {loading ? (
          <View style={pStyles.centered}>
            <ActivityIndicator size="large" color={Colors.Primary} />
          </View>
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item) => item.codigo}
            renderItem={({ item }) => (
              <TouchableOpacity style={pStyles.item} onPress={() => { setBusca(''); onSelect(item); }}>
                <Text style={pStyles.itemText}>{item.nome}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={pStyles.sep} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const pStyles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.Surface },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight },
  titulo:      { fontSize: 18, fontWeight: '700', color: Colors.Primary },
  fechar:      { fontSize: 20, color: Colors.TextMuted, padding: 4 },
  searchWrap:  { padding: 12 },
  searchInput: { backgroundColor: Colors.InputBg, borderRadius: 25, paddingHorizontal: 18, height: 46, fontSize: 15, color: Colors.Text },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item:        { paddingHorizontal: 20, paddingVertical: 14 },
  itemText:    { fontSize: 15, color: Colors.Text },
  sep:         { height: 1, backgroundColor: Colors.SurfaceLight, marginLeft: 20 },
});

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({ label, value, placeholder, error, disabled, onPress }: {
  label: string; value: string; placeholder: string;
  error?: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <View style={sfStyles.container}>
      <Text style={sfStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[sfStyles.field, error ? sfStyles.fieldError : null, disabled && sfStyles.fieldDisabled]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[sfStyles.value, !value && sfStyles.placeholder]}>{value || placeholder}</Text>
        <Text style={sfStyles.arrow}>›</Text>
      </TouchableOpacity>
      {error && <Text style={sfStyles.errorText}>{error}</Text>}
    </View>
  );
}

const sfStyles = StyleSheet.create({
  container:    { marginBottom: 16 },
  label:        { fontSize: 14, fontWeight: '600', color: Colors.Text, marginBottom: 6 },
  field:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.InputBg, borderRadius: 25, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 18, height: 50 },
  fieldError:   { borderColor: Colors.Error },
  fieldDisabled:{ opacity: 0.45 },
  value:        { flex: 1, fontSize: 15, color: Colors.Text },
  placeholder:  { color: Colors.TextMuted },
  arrow:        { fontSize: 20, color: Colors.TextMuted },
  errorText:    { color: Colors.Error, fontSize: 12, marginTop: 4, marginLeft: 8 },
});

// ── Formulário de veículo ─────────────────────────────────────────────────────

interface VeiculoFormProps {
  onSalvo: (perfil: import('@/types/api.types').ParticipanteResponse) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface VeiculoFormHandle {
  submit: () => void;
}

const VeiculoForm = forwardRef<VeiculoFormHandle, VeiculoFormProps>(function VeiculoForm({ onSalvo, onLoadingChange }, ref) {
  const { setUser } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>('CARRO');
  const [marcas, setMarcas]                 = useState<FipeMarca[]>([]);
  const [modelos, setModelos]               = useState<FipeModelo[]>([]);
  const [marcaSelecionada, setMarcaSel]     = useState<FipeMarca | null>(null);
  const [loadingMarcas, setLoadingMarcas]   = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [showMarcaPicker, setShowMarca]     = useState(false);
  const [showModeloPicker, setShowModelo]   = useState(false);
  const [salvando, setSalvando]             = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingData, setPendingData]       = useState<FormData | null>(null);

  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { marca: '', modelo: '', ano: '', cor: '', placa: '' },
  });

  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(onSubmit)(),
  }));

  useEffect(() => {
    setLoadingMarcas(true);
    fetchMarcas(tipoVeiculo)
      .then(setMarcas)
      .catch(() => showAlert('Erro', 'Não foi possível carregar as marcas.'))
      .finally(() => setLoadingMarcas(false));
    setMarcaSel(null);
    setModelos([]);
    setValue('marca', '');
    setValue('modelo', '');
  }, [tipoVeiculo]);

  const selecionarMarca = async (marca: FipeMarca) => {
    setMarcaSel(marca);
    setValue('marca', marca.nome, { shouldValidate: true });
    setValue('modelo', '');
    setModelos([]);
    setShowMarca(false);
    setLoadingModelos(true);
    try {
      setModelos(await fetchModelos(tipoVeiculo, marca.codigo));
    } catch {
      showAlert('Erro', 'Não foi possível carregar os modelos.');
    } finally {
      setLoadingModelos(false);
    }
  };

  const selecionarModelo = (modelo: FipeModelo) => {
    setValue('modelo', modelo.nome, { shouldValidate: true });
    setShowModelo(false);
  };

  const onSubmit = (data: FormData) => {
    setPendingData(data);
    setConfirmVisible(true);
  };

  const confirmarCadastro = async () => {
    if (!pendingData) return;
    setConfirmVisible(false);
    setSalvando(true);
    onLoadingChange?.(true);
    try {
      const payload = {
        placa:      pendingData.placa.toUpperCase(),
        tipo:       tipoVeiculo,
        marca:      pendingData.marca,
        modelo:     pendingData.modelo,
        ano:        parseInt(pendingData.ano, 10),
        cor:        pendingData.cor,
        capacidade: CAPACIDADE_POR_TIPO[tipoVeiculo],
      };
      const perfil = await participanteService.cadastrarVeiculo(payload);
      setUser(perfil);
      onSalvo(perfil);
      showAlert('Veículo cadastrado!', 'As informações foram salvas com sucesso.');
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar o veículo.');
    } finally {
      setSalvando(false);
      onLoadingChange?.(false);
      setPendingData(null);
    }
  };

  return (
    <>
      <View style={styles.formCard}>
        {/* Tipo de veículo */}
        <Text style={styles.formSecaoLabel}>Tipo de veículo</Text>
        <View style={styles.tipoRow}>
          {TIPOS_VEICULO.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tipoBtn, tipoVeiculo === t.value && styles.tipoBtnActive]}
              onPress={() => setTipoVeiculo(t.value)}
            >
              <Ionicons
                name={t.value === 'CARRO' ? 'car-sport-outline' : 'bicycle-outline'}
                size={26}
                color={tipoVeiculo === t.value ? Colors.Primary : Colors.TextMuted}
              />
              <Text style={[styles.tipoBtnLabel, tipoVeiculo === t.value && styles.tipoBtnLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formDivider} />
        <Text style={styles.formSecaoLabel}>Dados do veículo</Text>

        <Controller control={control} name="marca" render={({ field: { value } }) => (
          <SelectField
            label="Marca"
            value={value}
            placeholder={loadingMarcas ? 'Carregando marcas...' : 'Selecione a marca'}
            error={errors.marca?.message}
            disabled={loadingMarcas}
            onPress={() => setShowMarca(true)}
          />
        )} />

        <Controller control={control} name="modelo" render={({ field: { value } }) => (
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
            onPress={() => setShowModelo(true)}
          />
        )} />

        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <Controller control={control} name="ano" render={({ field: { value, onChange } }) => (
              <Input
                label="Ano" value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric" placeholder="2020"
                error={errors.ano?.message}
              />
            )} />
          </View>
          <View style={styles.rowHalf}>
            <Controller control={control} name="cor" render={({ field: { value, onChange } }) => (
              <Input
                label="Cor" value={value} onChangeText={onChange}
                placeholder="Preto" autoCapitalize="words"
                error={errors.cor?.message}
              />
            )} />
          </View>
        </View>

        <Controller control={control} name="placa" render={({ field: { value, onChange } }) => (
          <Input
            label="Placa" value={value}
            onChangeText={(t) => onChange(t.toUpperCase().slice(0, 7))}
            autoCapitalize="characters" placeholder="ABC1D23"
            error={errors.placa?.message}
          />
        )} />

        <View style={styles.formDivider} />

        <View style={styles.capacidadeRow}>
          <View style={styles.capacidadeIconWrap}>
            <Ionicons name="people-outline" size={20} color={Colors.Primary} />
          </View>
          <View>
            <Text style={styles.capacidadeLabel}>Capacidade automática</Text>
            <Text style={styles.capacidadeVal}>{CAPACIDADE_POR_TIPO[tipoVeiculo]} passageiro(s)</Text>
          </View>
        </View>
      </View>

      <PickerModal
        visible={showMarcaPicker} titulo="Selecionar Marca"
        itens={marcas} loading={loadingMarcas}
        onSelect={selecionarMarca}
        onClose={() => setShowMarca(false)}
      />
      <PickerModal
        visible={showModeloPicker} titulo="Selecionar Modelo"
        itens={modelos.map((m) => ({ codigo: String(m.codigo), nome: m.nome }))}
        loading={loadingModelos}
        onSelect={(item) => selecionarModelo({ codigo: Number(item.codigo), nome: item.nome })}
        onClose={() => setShowModelo(false)}
      />

      {/* Modal de confirmação UI19 */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={cfStyles.overlay}>
          <View style={cfStyles.card}>
            <Text style={cfStyles.titulo}>Confirmar veículo</Text>
            <Text style={cfStyles.subtitulo}>Revise os dados antes de cadastrar:</Text>
            {pendingData && (
              <View style={cfStyles.linhas}>
                {[
                  { label: 'Tipo',       value: tipoVeiculo === 'CARRO' ? 'Carro' : 'Motocicleta' },
                  { label: 'Marca',      value: pendingData.marca },
                  { label: 'Modelo',     value: pendingData.modelo },
                  { label: 'Ano',        value: pendingData.ano },
                  { label: 'Cor',        value: pendingData.cor },
                  { label: 'Placa',      value: pendingData.placa.toUpperCase() },
                  { label: 'Capacidade', value: `${CAPACIDADE_POR_TIPO[tipoVeiculo]} passageiro(s)` },
                ].map(({ label, value }) => (
                  <View key={label} style={cfStyles.linha}>
                    <Text style={cfStyles.linhaLabel}>{label}</Text>
                    <Text style={cfStyles.linhaValor}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={cfStyles.botoes}>
              <Button title="Corrigir" onPress={() => setConfirmVisible(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title="Confirmar" onPress={confirmarCadastro} variant="primary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
      {alertModal}
    </>
  );
});

const cfStyles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: Colors.Surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  titulo:    { fontSize: 18, fontWeight: '800', color: Colors.Primary, marginBottom: 4 },
  subtitulo: { fontSize: 13, color: Colors.TextMuted, marginBottom: 16 },
  linhas:    { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.SurfaceLight, marginBottom: 20 },
  linha:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.SurfaceLight, borderBottomWidth: 1, borderBottomColor: Colors.Surface },
  linhaLabel: { fontSize: 13, color: Colors.TextMuted, fontWeight: '600' },
  linhaValor: { fontSize: 13, color: Colors.Text, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 16 },
  botoes:    { flexDirection: 'row', gap: 10 },
});

// ── Card de veículo ────────────────────────────────────────────────────────────

function VeiculoCard({
  veiculo,
  onRemover,
  removendo,
}: {
  veiculo: VeiculoResponse;
  onRemover: () => void;
  removendo: boolean;
}) {
  return (
    <View style={styles.veiculoCard}>
      <View style={styles.veiculoCardHeader}>
        <View style={styles.veiculoIconWrap}>
          <Ionicons
            name={veiculo.tipo === 'MOTOCICLETA' ? 'bicycle-outline' : 'car-sport-outline'}
            size={28} color={Colors.Primary}
          />
        </View>
        <TouchableOpacity onPress={onRemover} style={styles.iconBtn} disabled={removendo}>
          {removendo
            ? <ActivityIndicator size="small" color={Colors.Error} />
            : <Ionicons name="trash-outline" size={20} color={Colors.Error} />
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.veiculoNome} numberOfLines={1}>{veiculo.marca} {veiculo.modelo}</Text>
      <Text style={styles.veiculoSub}>{veiculo.cor} · {veiculo.ano}</Text>

      <View style={styles.veiculoDivider} />

      <View style={styles.veiculoBadgesRow}>
        <View style={styles.veiculoBadge}>
          <Ionicons name="card-outline" size={13} color={Colors.Primary} />
          <Text style={styles.veiculoBadgeText}>{veiculo.placa}</Text>
        </View>
        <View style={styles.veiculoBadge}>
          <Ionicons name="people-outline" size={13} color={Colors.Primary} />
          <Text style={styles.veiculoBadgeText}>{veiculo.capacidade} vagas</Text>
        </View>
      </View>
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function VeiculoScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const [veiculos, setVeiculos]       = useState<VeiculoResponse[]>([]);
  const [carregando, setCarregando]   = useState(true);
  const [removendo, setRemovendo]     = useState<number | null>(null);
  const [formVisivel, setFormVisivel] = useState(false);
  const [salvandoForm, setSalvandoForm] = useState(false);
  const formRef = useRef<VeiculoFormHandle>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setVeiculos(await participanteService.listarVeiculos());
    } catch {
      showAlert('Erro', 'Não foi possível carregar os veículos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const abrirNovoForm = () => setFormVisivel(true);

  const handleSalvo = (perfil: import('@/types/api.types').ParticipanteResponse) => {
    setVeiculos(perfil.veiculos ?? []);
    setFormVisivel(false);
  };

  const handleRemover = (v: VeiculoResponse) => {
    showAlert(
      'Remover veículo',
      `Deseja remover o ${v.marca} ${v.modelo} (${v.placa})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setRemovendo(v.id);
            try {
              await participanteService.removerVeiculo(v.id);
              const lista = veiculos.filter((x) => x.id !== v.id);
              setVeiculos(lista);
            } catch {
              showAlert('Erro', 'Não foi possível remover o veículo.');
            } finally {
              setRemovendo(null);
            }
          },
        },
      ]
    );
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.Primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Meus Veículos</Text>
        <Text style={styles.subtitle}>
          {veiculos.length === 0
            ? 'Nenhum veículo cadastrado.'
            : `${veiculos.length} veículo(s) cadastrado(s).`}
        </Text>

        {veiculos.map((v) => (
          <VeiculoCard
            key={v.id}
            veiculo={v}
            onRemover={() => handleRemover(v)}
            removendo={removendo === v.id}
          />
        ))}

        {veiculos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhum veículo cadastrado</Text>
            <Button
              title="Cadastrar veículo"
              onPress={abrirNovoForm}
              variant="primary"
              style={{ marginTop: 16, width: 220 }}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB — Adicionar veículo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={abrirNovoForm}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal — Formulário de veículo */}
      <Modal
        visible={formVisivel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisivel(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Veículo</Text>
              <TouchableOpacity onPress={() => setFormVisivel(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <VeiculoForm
              ref={formRef}
              onSalvo={handleSalvo}
              onLoadingChange={setSalvandoForm}
            />
          </ScrollView>
          <View style={styles.floatBar}>
            <Button
              title="Cadastrar veículo"
              onPress={() => formRef.current?.submit()}
              variant="primary"
              loading={salvandoForm}
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
  safe:     { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:   { flexGrow: 1, padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backBtn:  { padding: 4 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitle: { fontSize: 13, color: Colors.TextMuted, marginTop: 2, marginBottom: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },

  // Card de veículo
  veiculoCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1.5, borderColor: Colors.Primary + '20',
  },
  veiculoCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  veiculoIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.Primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  veiculoNome:    { fontSize: 20, fontWeight: '800', color: Colors.Primary },
  veiculoSub:     { fontSize: 14, color: Colors.TextMuted, marginTop: 2 },
  iconBtn:        { padding: 8 },
  veiculoDivider: { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 14 },
  veiculoBadgesRow: { flexDirection: 'row', gap: 10 },
  veiculoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.Primary + '12', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  veiculoBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.Primary },

  // Modal
  modalSafeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },
  modalScroll:   { padding: 20, paddingBottom: 8, flexGrow: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.Primary },
  modalClose: { fontSize: 20, color: Colors.TextMuted, padding: 4 },
  floatBar: {
    padding: 20, paddingTop: 12,
    backgroundColor: Colors.SurfaceLight,
    borderTopWidth: 1, borderTopColor: Colors.Primary + '15',
  },

  // Formulário
  formCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  formSecaoLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.Primary,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14,
  },
  formDivider: {
    height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 16,
  },

  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tipoBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.Primary + '25', backgroundColor: Colors.SurfaceLight,
  },
  tipoBtnActive:      { borderColor: Colors.Primary, backgroundColor: Colors.Primary + '12' },
  tipoBtnLabel:       { fontSize: 13, color: Colors.TextMuted, fontWeight: '600' },
  tipoBtnLabelActive: { color: Colors.Primary, fontWeight: '700' },

  row:     { flexDirection: 'row', gap: 12 },
  rowHalf: { flex: 1 },

  capacidadeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  capacidadeIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.Primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  capacidadeLabel: { fontSize: 11, fontWeight: '700', color: Colors.Primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  capacidadeVal:   { fontSize: 15, fontWeight: '700', color: Colors.Text, marginTop: 1 },

  // Empty state
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:    { fontSize: 16, color: Colors.TextMuted, marginBottom: 20 },
  emptySubtitle: { fontSize: 14, color: Colors.TextMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
