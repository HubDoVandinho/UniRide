import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { authService } from '@/services/auth.service';
import { instituicaoService } from '@/services/instituicao.service';
import { participanteService } from '@/services/participante.service';
import { useAuthStore } from '@/stores/auth.store';
import { InstituicaoInfo, TipoVeiculo } from '@/types/api.types';

// ── Regex / helpers ───────────────────────────────────────────────────────────

const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-])[A-Za-z\d@$!%*?&_\-]{8,}$/;
const usernameRegex = /^[a-z][a-z0-9._]{2,29}$/;

const formatCpf = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatCep = (v: string) => v.replace(/\D/g, '').slice(0, 8);

// ── Schemas ───────────────────────────────────────────────────────────────────

const schema1 = z.object({
  nome:               z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  username:           z.string().optional().refine(
    (v) => !v || usernameRegex.test(v),
    { message: 'Use apenas letras minúsculas, números, ponto ou underline (mín. 3 caracteres)' }
  ),
  emailPessoal:       z.string().email('E-mail pessoal inválido'),
  emailInstitucional: z.string().email('E-mail institucional inválido'),
  cpf:                z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido. Use: 000.000.000-00'),
  senha:              z.string().regex(senhaRegex, 'Senha deve conter maiúscula, minúscula, número e especial (@$!%*?&_-)'),
  confirmarSenha:     z.string().min(1, 'Confirme a senha'),
  instituicaoId:      z.number({ required_error: 'Selecione uma instituição' }).positive('Selecione uma instituição'),
}).refine((d) => d.senha === d.confirmarSenha, { message: 'As senhas não conferem', path: ['confirmarSenha'] });

const schema2 = z.object({
  nome:   z.string().max(60).optional(),
  cep:    z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos numéricos'),
  rua:    z.string().min(2, 'Informe a rua'),
  numero: z.string().max(20).optional(),
  bairro: z.string().min(2, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  estado: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
});

const schema3 = z.object({
  cnh:        z.string().length(11, 'CNH deve ter exatamente 11 dígitos').regex(/^\d+$/, 'Apenas números'),
  marca:      z.string().min(1, 'Selecione a marca'),
  modelo:     z.string().min(1, 'Selecione o modelo'),
  ano:        z.string().regex(/^\d{4}$/, 'Ano inválido').refine((v) => { const n = parseInt(v, 10); return n >= 1950 && n <= 2030; }, 'Ano entre 1950 e 2030'),
  cor:        z.string().min(1, 'Cor é obrigatória'),
  placa:      z.string().toUpperCase().regex(/^[A-Z]{3}\d[A-Z\d]\d{2}$|^[A-Z]{3}\d{4}$/, 'Placa inválida (ex: ABC1234 ou ABC1D23)'),
  capacidade: z.string().regex(/^\d+$/, 'Inválido').refine((v) => { const n = parseInt(v, 10); return n >= 1 && n <= 8; }, 'Entre 1 e 8'),
});

type Form1 = z.infer<typeof schema1>;
type Form2 = z.infer<typeof schema2>;
type Form3 = z.infer<typeof schema3>;

// ── FIPE helpers ──────────────────────────────────────────────────────────────

interface FipeMarca  { codigo: string; nome: string; }
interface FipeModelo { codigo: number; nome: string; }

const FIPE_TIPO: Record<TipoVeiculo, string> = { CARRO: 'carros', MOTOCICLETA: 'motos', VAN: 'caminhoes' };

async function fetchMarcas(tipo: TipoVeiculo): Promise<FipeMarca[]> {
  const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas`);
  if (!res.ok) throw new Error('Erro ao buscar marcas');
  return res.json();
}

async function fetchModelos(tipo: TipoVeiculo, codigoMarca: string): Promise<FipeModelo[]> {
  const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${FIPE_TIPO[tipo]}/marcas/${codigoMarca}/modelos`);
  if (!res.ok) throw new Error('Erro ao buscar modelos');
  const data = await res.json();
  return data.modelos ?? [];
}

// ── PickerModal ───────────────────────────────────────────────────────────────

function PickerModal({ visible, titulo, itens, loading, onSelect, onClose }: {
  visible: boolean; titulo: string;
  itens: { codigo: string; nome: string }[];
  loading: boolean;
  onSelect: (item: { codigo: string; nome: string }) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('');
  const filtrados = busca.trim()
    ? itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))
    : itens;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pStyles.safe}>
        <View style={pStyles.header}>
          <Text style={pStyles.titulo}>{titulo}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={Colors.TextMuted} /></TouchableOpacity>
        </View>
        <View style={pStyles.searchWrap}>
          <TextInput
            style={pStyles.searchInput} placeholder="Buscar..." placeholderTextColor={Colors.TextMuted}
            value={busca} onChangeText={setBusca} autoFocus
          />
        </View>
        {loading ? (
          <View style={pStyles.centered}><ActivityIndicator size="large" color={Colors.Primary} /></View>
        ) : (
          <FlatList
            data={filtrados} keyExtractor={(item) => item.codigo}
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
        onPress={disabled ? undefined : onPress} activeOpacity={disabled ? 1 : 0.7}
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

// ── Indicador de progresso ────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={pbStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[pbStyles.segment, i < step && pbStyles.segmentAtivo, i > 0 && { marginLeft: 6 }]}
        />
      ))}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row:          { flexDirection: 'row', marginBottom: 20 },
  segment:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  segmentAtivo: { backgroundColor: Colors.TextLight },
});

// ── Tela principal ────────────────────────────────────────────────────────────

export default function CadastroPassageiroScreen() {
  const router = useRouter();
  const { login, refreshSession } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [modalMotorista, setModalMotorista] = useState(false);

  // Dados coletados entre steps
  const dadosStep1 = useRef<Form1 | null>(null);
  const dadosStep2 = useRef<Form2 | null>(null);

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [buscaInstituicao, setBuscaInstituicao] = useState('');
  const [resultados, setResultados] = useState<InstituicaoInfo[]>([]);
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [buscando, setBuscando] = useState(false);

  const form1 = useForm<Form1>({
    resolver: zodResolver(schema1),
    defaultValues: { nome: '', emailPessoal: '', emailInstitucional: '', cpf: '', senha: '', confirmarSenha: '' },
  });

  const verificarUsername = useCallback((valor: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!valor || valor.length < 3 || !usernameRegex.test(valor)) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const disponivel = await participanteService.verificarUsername(valor);
        setUsernameStatus(disponivel ? 'available' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 500);
  }, []);

  const buscarInstituicoes = useCallback(async (termo: string) => {
    if (termo.length < 3) { setResultados([]); return; }
    setBuscando(true);
    try { setResultados(await instituicaoService.buscar(termo)); }
    catch { setResultados([]); }
    finally { setBuscando(false); }
  }, []);

  const selecionarInstituicao = (inst: InstituicaoInfo) => {
    form1.setValue('instituicaoId', inst.id, { shouldValidate: true });
    setNomeInstituicao(`${inst.nome} — ${inst.cidade}/${inst.estado}`);
    setResultados([]);
    setBuscaInstituicao('');
  };

  const onStep1Next = form1.handleSubmit((data) => {
    dadosStep1.current = data;
    setStep(2);
  });

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  const [cepLoading, setCepLoading] = useState(false);

  const form2 = useForm<Form2>({
    resolver: zodResolver(schema2),
    defaultValues: { nome: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' },
  });

  const buscarCep = async (cep: string) => {
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { showAlert('CEP não encontrado', 'Preencha os campos manualmente.'); return; }
      form2.setValue('rua', data.logradouro ?? '', { shouldValidate: true });
      form2.setValue('bairro', data.bairro ?? '', { shouldValidate: true });
      form2.setValue('cidade', data.localidade ?? '', { shouldValidate: true });
      form2.setValue('estado', data.uf ?? '', { shouldValidate: true });
    } catch { showAlert('Erro', 'Não foi possível buscar o CEP.'); }
    finally { setCepLoading(false); }
  };

  const onStep2Next = form2.handleSubmit((data) => {
    dadosStep2.current = data;
    setModalMotorista(true);
  });

  // ── Submissão final ────────────────────────────────────────────────────────

  const submeterConta = async (virarMotorista: boolean, dadosDriver?: Form3, tipoVeiculo?: TipoVeiculo) => {
    const s1 = dadosStep1.current!;
    const s2 = dadosStep2.current!;
    setLoading(true);
    try {
      // 1. Criar conta passageiro (endereço incluído no payload)
      await authService.cadastrarPassageiro({
        nome: s1.nome, username: s1.username || undefined,
        emailPessoal: s1.emailPessoal, emailInstitucional: s1.emailInstitucional,
        cpf: s1.cpf, senha: s1.senha,
        instituicaoId: s1.instituicaoId,
        endereco: {
          nome: s2.nome || undefined,
          cep: s2.cep, rua: s2.rua, numero: s2.numero || undefined,
          bairro: s2.bairro, cidade: s2.cidade, estado: s2.estado.toUpperCase(),
        },
      });

      // 2. Auto-login (pode falhar se o backend exigir verificação de e-mail)
      let loginOk = false;
      try {
        await login(s1.emailPessoal, s1.senha);
        loginOk = true;
      } catch {
        // Conta criada mas pendente de verificação — fluxo esperado
      }

      if (loginOk) {
        // 3. Promover a motorista (se solicitado)
        if (virarMotorista && dadosDriver && tipoVeiculo) {
          await participanteService.promoverMotorista({
            cnh: dadosDriver.cnh,
            veiculo: {
              placa: dadosDriver.placa.toUpperCase(), tipo: tipoVeiculo,
              marca: dadosDriver.marca, modelo: dadosDriver.modelo,
              ano: parseInt(dadosDriver.ano, 10), cor: dadosDriver.cor,
              capacidade: parseInt(dadosDriver.capacidade, 10),
            },
          });
          await refreshSession();
        }

        // Conta já ativa e não é motorista: vai para preferências (primeiro acesso)
        const contaAtiva = useAuthStore.getState().user?.status === 'ATIVO';
        if (contaAtiva && !virarMotorista) {
          router.replace('/perfil/preferencias');
          return;
        }
      }

      // Conta criada com sucesso — pede verificação de e-mail
      router.replace({
        pathname: '/(auth)/verificar-email',
        params: { email: s1.emailInstitucional },
      });
    } catch (err: unknown) {
      showAlert('Erro', err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>('CARRO');
  const [marcas, setMarcas]           = useState<FipeMarca[]>([]);
  const [modelos, setModelos]         = useState<FipeModelo[]>([]);
  const [marcaSel, setMarcaSel]       = useState<FipeMarca | null>(null);
  const [loadingMarcas, setLoadingMarcas]   = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [showMarcaPicker, setShowMarcaPicker]   = useState(false);
  const [showModeloPicker, setShowModeloPicker] = useState(false);

  const form3 = useForm<Form3>({
    resolver: zodResolver(schema3),
    defaultValues: { cnh: '', marca: '', modelo: '', ano: '', cor: '', placa: '', capacidade: '4' },
  });

  useEffect(() => {
    if (step !== 3) return;
    setMarcaSel(null); setModelos([]);
    form3.setValue('marca', ''); form3.setValue('modelo', '');
    setLoadingMarcas(true);
    fetchMarcas(tipoVeiculo)
      .then(setMarcas)
      .catch(() => showAlert('Erro', 'Não foi possível carregar as marcas.'))
      .finally(() => setLoadingMarcas(false));
  }, [tipoVeiculo, step]);

  const selecionarMarca = async (marca: FipeMarca) => {
    setMarcaSel(marca);
    form3.setValue('marca', marca.nome, { shouldValidate: true });
    form3.setValue('modelo', '');
    setModelos([]); setShowMarcaPicker(false);
    setLoadingModelos(true);
    try { setModelos(await fetchModelos(tipoVeiculo, marca.codigo)); }
    catch { showAlert('Erro', 'Não foi possível carregar os modelos.'); }
    finally { setLoadingModelos(false); }
  };

  const onStep3Submit = form3.handleSubmit((data) => {
    submeterConta(true, data, tipoVeiculo);
  });

  // ── Títulos e subtítulos por step ──────────────────────────────────────────

  const stepTitulo = ['Dados pessoais', 'Seu endereço', 'Perfil de motorista'][step - 1];
  const stepSub    = [
    'Preencha seus dados para criar sua conta.',
    'Seu endereço será usado para encontrar caronas próximas.',
    'Informe sua habilitação e cadastre seu veículo.',
  ][step - 1];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => step === 1 ? router.back() : setStep((s) => (s - 1) as 1 | 2 | 3)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.TextLight} />
          </TouchableOpacity>
          <ProgressBar step={step} total={3} />
          <Text style={styles.stepLabel}>Passo {step} de 3</Text>
          <Text style={styles.title}>{stepTitulo}</Text>
          <Text style={styles.subtitle}>{stepSub}</Text>
        </View>

        {/* ── STEP 1: Dados pessoais ─────────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.card}>
            <Controller control={form1.control} name="nome" render={({ field: { value, onChange } }) => (
              <Input label="Nome completo" value={value} onChangeText={onChange}
                placeholder="Seu nome completo" autoCapitalize="words" error={form1.formState.errors.nome?.message} />
            )} />

            <Controller control={form1.control} name="username" render={({ field: { value, onChange } }) => (
              <View style={styles.usernameGroup}>
                <Input
                  label="@usuário (opcional)" value={value ?? ''}
                  onChangeText={(t) => { const v = t.toLowerCase().replace(/[^a-z0-9._]/g, ''); onChange(v); verificarUsername(v); }}
                  placeholder="ex: joao.silva" autoCapitalize="none" autoCorrect={false}
                  error={form1.formState.errors.username?.message}
                  borderColor={
                    usernameStatus === 'available' ? Colors.Success :
                    usernameStatus === 'taken' ? Colors.Error :
                    undefined
                  }
                />
                {usernameStatus === 'available' && <Text style={styles.usernameAvailable}>@{value} disponível</Text>}
                {usernameStatus === 'taken'     && <Text style={styles.usernameTaken}>@{value} já está em uso</Text>}
                <Text style={styles.usernameHint}>Se deixar em branco, será gerado automaticamente.</Text>
              </View>
            )} />

            <Controller control={form1.control} name="emailPessoal" render={({ field: { value, onChange } }) => (
              <Input label="E-mail pessoal" value={value} onChangeText={onChange}
                placeholder="seu@gmail.com" keyboardType="email-address" autoCapitalize="none"
                error={form1.formState.errors.emailPessoal?.message} />
            )} />

            <Controller control={form1.control} name="emailInstitucional" render={({ field: { value, onChange } }) => (
              <Input label="E-mail institucional" value={value} onChangeText={onChange}
                placeholder="seu@universidade.edu.br" keyboardType="email-address" autoCapitalize="none"
                error={form1.formState.errors.emailInstitucional?.message} />
            )} />

            <Controller control={form1.control} name="cpf" render={({ field: { value, onChange } }) => (
              <Input label="CPF" value={value} onChangeText={(t) => onChange(formatCpf(t))}
                placeholder="000.000.000-00" keyboardType="numeric"
                error={form1.formState.errors.cpf?.message} />
            )} />

            <Controller control={form1.control} name="senha" render={({ field: { value, onChange } }) => (
              <Input label="Senha" value={value} onChangeText={onChange}
                placeholder="Mínimo 8 caracteres"
                secureTextEntry error={form1.formState.errors.senha?.message} />
            )} />

            <Controller control={form1.control} name="confirmarSenha" render={({ field: { value, onChange } }) => (
              <Input label="Confirmar senha" value={value} onChangeText={onChange}
                placeholder="Repita sua senha"
                secureTextEntry error={form1.formState.errors.confirmarSenha?.message} />
            )} />
            <Text style={styles.senhaHint}>
              A senha deve ter ao menos 8 caracteres, incluindo maiúscula, minúscula, número e um caractere especial (@$!%*?&_-).
            </Text>

            {/* Seletor de instituição */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Instituição</Text>
              {nomeInstituicao ? (
                <View style={styles.instituicaoSelecionada}>
                  <Text style={styles.instituicaoNome} numberOfLines={2}>{nomeInstituicao}</Text>
                  <TouchableOpacity onPress={() => { form1.setValue('instituicaoId', undefined as unknown as number); setNomeInstituicao(''); }}>
                    <Ionicons name="close-circle" size={20} color={Colors.TextMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.buscaRow}>
                    <TextInput
                      style={styles.buscaInput} value={buscaInstituicao}
                      onChangeText={setBuscaInstituicao} placeholder="Nome da universidade"
                      placeholderTextColor="#999"
                      onSubmitEditing={() => buscarInstituicoes(buscaInstituicao)}
                    />
                    <TouchableOpacity style={styles.buscaBtn} onPress={() => buscarInstituicoes(buscaInstituicao)} disabled={buscando}>
                      {buscando
                        ? <ActivityIndicator size="small" color={Colors.TextLight} />
                        : <Text style={styles.buscaBtnText}>Buscar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {resultados.length > 0 && (
                    <View style={styles.resultadosList}>
                      {resultados.map((inst) => (
                        <TouchableOpacity key={inst.id} style={styles.resultadoItem} onPress={() => selecionarInstituicao(inst)}>
                          <Text style={styles.resultadoNome}>{inst.nome}</Text>
                          <Text style={styles.resultadoCidade}>{inst.cidade}/{inst.estado}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              {form1.formState.errors.instituicaoId && (
                <Text style={styles.errorText}>{form1.formState.errors.instituicaoId.message}</Text>
              )}
            </View>

            <Button title="Próximo →" onPress={onStep1Next} variant="primary" style={styles.submitButton} />
          </View>
        )}

        {/* ── STEP 2: Endereço ──────────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.card}>
            <Controller control={form2.control} name="nome" render={({ field: { value, onChange } }) => (
              <Input label="Nome do endereço (opcional)" value={value ?? ''} onChangeText={onChange}
                placeholder="Ex: Casa, Trabalho, Faculdade..." autoCapitalize="words"
                error={form2.formState.errors.nome?.message} />
            )} />

            {/* CEP + Número — mesma linha */}
            <View style={styles.inputRow}>
              <View style={styles.inputFlex}>
                <Controller control={form2.control} name="cep" render={({ field: { value, onChange } }) => (
                  <View>
                    <Input label="CEP" value={value}
                      onChangeText={(t) => { const c = formatCep(t); onChange(c); if (c.length === 8) buscarCep(c); }}
                      placeholder="00000000" keyboardType="numeric"
                      error={form2.formState.errors.cep?.message} />
                    {cepLoading && (
                      <View style={styles.cepLoading}>
                        <ActivityIndicator size="small" color={Colors.Primary} />
                        <Text style={styles.cepLoadingText}>Buscando...</Text>
                      </View>
                    )}
                  </View>
                )} />
              </View>
              <View style={styles.inputFlex}>
                <Controller control={form2.control} name="numero" render={({ field: { value, onChange } }) => (
                  <Input label="Número" value={value ?? ''} onChangeText={onChange}
                    placeholder="123 ou S/N"
                    error={form2.formState.errors.numero?.message} />
                )} />
              </View>
            </View>

            <Controller control={form2.control} name="rua" render={({ field: { value, onChange } }) => (
              <Input label="Rua / Avenida" value={value} onChangeText={onChange}
                placeholder="Ex: Rua das Flores" autoCapitalize="words"
                error={form2.formState.errors.rua?.message} />
            )} />

            <Controller control={form2.control} name="bairro" render={({ field: { value, onChange } }) => (
              <Input label="Bairro" value={value} onChangeText={onChange}
                placeholder="Ex: Centro" autoCapitalize="words"
                error={form2.formState.errors.bairro?.message} />
            )} />

            {/* Cidade + Estado — mesma linha */}
            <View style={styles.inputRow}>
              <View style={[styles.inputFlex, { flex: 2 }]}>
                <Controller control={form2.control} name="cidade" render={({ field: { value, onChange } }) => (
                  <Input label="Cidade" value={value} onChangeText={onChange}
                    placeholder="Ex: Sorocaba" autoCapitalize="words"
                    error={form2.formState.errors.cidade?.message} />
                )} />
              </View>
              <View style={styles.inputFlex}>
                <Controller control={form2.control} name="estado" render={({ field: { value, onChange } }) => (
                  <Input label="Estado" value={value}
                    onChangeText={(t) => onChange(t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                    placeholder="SP" autoCapitalize="characters"
                    error={form2.formState.errors.estado?.message} />
                )} />
              </View>
            </View>

            <Button title="Continuar →" onPress={onStep2Next} variant="primary" style={styles.submitButton} />
          </View>
        )}

        {/* ── STEP 3: Perfil de motorista ───────────────────────────────── */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Habilitação</Text>
            <Controller control={form3.control} name="cnh" render={({ field: { value, onChange } }) => (
              <Input label="Número da CNH (11 dígitos)" value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 11))}
                placeholder="Ex: 01234567890" keyboardType="numeric"
                error={form3.formState.errors.cnh?.message} />
            )} />

            <Text style={[styles.cardSectionTitle, { marginTop: 8 }]}>Veículo</Text>

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.tipoRow}>
              {([{ value: 'CARRO', label: 'Carro', icon: 'car-outline' }, { value: 'MOTOCICLETA', label: 'Moto', icon: 'bicycle-outline' }] as const).map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.tipoBtn, tipoVeiculo === t.value && styles.tipoBtnActive]}
                  onPress={() => setTipoVeiculo(t.value)}
                >
                  <Ionicons name={t.icon} size={20} color={tipoVeiculo === t.value ? Colors.Primary : Colors.TextMuted} />
                  <Text style={[styles.tipoBtnLabel, tipoVeiculo === t.value && styles.tipoBtnLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Controller control={form3.control} name="marca" render={({ field: { value } }) => (
              <SelectField label="Marca" value={value}
                placeholder={loadingMarcas ? 'Carregando marcas...' : 'Selecione a marca'}
                error={form3.formState.errors.marca?.message} disabled={loadingMarcas}
                onPress={() => setShowMarcaPicker(true)} />
            )} />

            <Controller control={form3.control} name="modelo" render={({ field: { value } }) => (
              <SelectField label="Modelo" value={value}
                placeholder={!marcaSel ? 'Selecione a marca primeiro' : loadingModelos ? 'Carregando...' : 'Selecione o modelo'}
                error={form3.formState.errors.modelo?.message} disabled={!marcaSel || loadingModelos}
                onPress={() => setShowModeloPicker(true)} />
            )} />

            <View style={styles.row}>
              <View style={styles.rowHalf}>
                <Controller control={form3.control} name="ano" render={({ field: { value, onChange } }) => (
                  <Input label="Ano" value={value}
                    onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="numeric" placeholder="2020" error={form3.formState.errors.ano?.message} />
                )} />
              </View>
              <View style={styles.rowHalf}>
                <Controller control={form3.control} name="cor" render={({ field: { value, onChange } }) => (
                  <Input label="Cor" value={value} onChangeText={onChange}
                    placeholder="Preto" autoCapitalize="words" error={form3.formState.errors.cor?.message} />
                )} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowLarge}>
                <Controller control={form3.control} name="placa" render={({ field: { value, onChange } }) => (
                  <Input label="Placa" value={value}
                    onChangeText={(t) => onChange(t.toUpperCase().slice(0, 7))}
                    autoCapitalize="characters" placeholder="ABC1D23" error={form3.formState.errors.placa?.message} />
                )} />
              </View>
              <View style={styles.rowSmall}>
                <Controller control={form3.control} name="capacidade" render={({ field: { value, onChange } }) => (
                  <Input label="Vagas" value={value}
                    onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 1))}
                    keyboardType="numeric" placeholder="4" error={form3.formState.errors.capacidade?.message} />
                )} />
              </View>
            </View>

            <Button
              title="Finalizar cadastro"
              onPress={onStep3Submit}
              variant="primary"
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Modal: Virar Motorista? ─────────────────────────────────────────── */}
      <Modal visible={modalMotorista} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Ionicons name="car-outline" size={52} color={Colors.Primary} style={{ marginBottom: 12 }} />
                <Text style={styles.modalTitulo}>Quer oferecer caronas?</Text>
                <Text style={styles.modalTexto}>
                  Você pode se cadastrar agora como motorista e começar a oferecer caronas para seus colegas.
                </Text>

                <TouchableOpacity
                  style={styles.modalBtnPrimario}
                  onPress={() => { setModalMotorista(false); setStep(3); }}
                >
                  <Text style={styles.modalBtnPrimarioText}>Sim, quero oferecer caronas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnSecundario}
                  onPress={() => { setModalMotorista(false); submeterConta(false); }}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.TextMuted} />
                    : <Text style={styles.modalBtnSecundarioText}>Não, só vou pegar caronas</Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Pickers FIPE (step 3) */}
      <PickerModal
        visible={showMarcaPicker} titulo="Selecionar Marca"
        itens={marcas} loading={loadingMarcas}
        onSelect={selecionarMarca} onClose={() => setShowMarcaPicker(false)}
      />
      <PickerModal
        visible={showModeloPicker} titulo="Selecionar Modelo"
        itens={modelos.map((m) => ({ codigo: String(m.codigo), nome: m.nome }))}
        loading={loadingModelos}
        onSelect={(item) => { form3.setValue('modelo', item.nome, { shouldValidate: true }); setShowModeloPicker(false); }}
        onClose={() => setShowModeloPicker(false)}
      />
      {alertModal}
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.Background },
  scroll:   { flexGrow: 1, padding: 24 },

  header:    { marginBottom: 24 },
  backBtn:   { alignSelf: 'flex-start', padding: 4, marginBottom: 16 },
  stepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  title:     { fontSize: 26, fontWeight: '800', color: Colors.TextLight, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  card: {
    backgroundColor: Colors.Surface, borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  cardSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.Primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  fieldGroup:  { marginBottom: 16 },
  fieldLabel:  { fontSize: 14, fontWeight: '600', color: Colors.Text, marginBottom: 6 },
  submitButton:{ marginTop: 8 },

  buscaRow: { flexDirection: 'row', gap: 8 },
  buscaInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333', backgroundColor: '#FAFAFA',
  },
  buscaBtn: { backgroundColor: Colors.Primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', minWidth: 72, alignItems: 'center' },
  buscaBtnText: { color: Colors.TextLight, fontWeight: '600', fontSize: 14 },
  resultadosList: { marginTop: 8, borderWidth: 1, borderColor: '#EEE', borderRadius: 12, overflow: 'hidden' },
  resultadoItem:  { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  resultadoNome:  { fontSize: 14, fontWeight: '600', color: '#222' },
  resultadoCidade:{ fontSize: 12, color: '#666', marginTop: 2 },
  instituicaoSelecionada: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.SurfaceLight, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: Colors.Primary },
  instituicaoNome:{ flex: 1, fontSize: 14, color: Colors.Primary, fontWeight: '600' },
  limparBtn:      { fontSize: 16, color: '#999', paddingLeft: 8 },
  errorText:      { color: '#FF4444', fontSize: 12, marginTop: 4 },

  usernameGroup:    { marginBottom: 0 },
  usernameChecking: { fontSize: 12, color: Colors.TextMuted, marginTop: 4, marginBottom: 8 },
  usernameAvailable:{ fontSize: 12, color: Colors.Success, marginTop: 4, fontWeight: '600', marginBottom: 8 },
  usernameTaken:    { fontSize: 12, color: Colors.Error, marginTop: 4, fontWeight: '600', marginBottom: 8 },
  usernameHint:     { fontSize: 12, color: Colors.TextMuted, marginTop: -12, marginBottom: 16, lineHeight: 18 },
  senhaHint:        { fontSize: 12, color: Colors.TextMuted, marginTop: -12, marginBottom: 16, lineHeight: 18 },

  inputRow:       { flexDirection: 'row', gap: 12 },
  inputFlex:      { flex: 1 },
  cepLoading:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 },
  cepLoadingText: { fontSize: 12, color: Colors.TextMuted },

  // Step 3 — veículo
  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(123,47,190,0.2)', backgroundColor: Colors.SurfaceLight },
  tipoBtnActive:      { borderColor: Colors.Primary, backgroundColor: Colors.Primary + '12' },
  tipoBtnLabel:       { fontSize: 13, color: Colors.TextMuted, fontWeight: '600' },
  tipoBtnLabelActive: { color: Colors.Primary },
  row:      { flexDirection: 'row', gap: 12 },
  rowHalf:  { flex: 1 },
  rowLarge: { flex: 2 },
  rowSmall: { flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:    { backgroundColor: Colors.Surface, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  modalIcon:    { marginBottom: 12 },
  modalTitulo:  { fontSize: 22, fontWeight: '800', color: Colors.Primary, marginBottom: 12, textAlign: 'center' },
  modalTexto:   { fontSize: 14, color: Colors.TextMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnPrimario:     { backgroundColor: Colors.Primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', alignItems: 'center', marginBottom: 12 },
  modalBtnPrimarioText: { color: Colors.TextLight, fontSize: 15, fontWeight: '700' },
  modalBtnSecundario:   { paddingVertical: 10 },
  modalBtnSecundarioText:{ color: Colors.TextMuted, fontSize: 14, textDecorationLine: 'underline' },
});
