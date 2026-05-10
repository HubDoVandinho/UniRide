import React, { useState, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { authService } from '@/services/auth.service';
import { instituicaoService } from '@/services/instituicao.service';
import { participanteService } from '@/services/participante.service';
import { InstituicaoInfo } from '@/types/api.types';

const senhaRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-])[A-Za-z\d@$!%*?&_\-]{8,}$/;

const usernameRegex = /^[a-z][a-z0-9._]{2,29}$/;

const schema = z
  .object({
    nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
    username: z
      .string()
      .optional()
      .refine((v) => !v || usernameRegex.test(v), {
        message: 'Use apenas letras minúsculas, números, ponto ou underline (mín. 3 caracteres)',
      }),
    emailPessoal: z.string().email('E-mail pessoal inválido'),
    emailInstitucional: z.string().email('E-mail institucional inválido'),
    cpf: z
      .string()
      .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido. Use: 000.000.000-00'),
    senha: z
      .string()
      .regex(
        senhaRegex,
        'Senha deve conter maiúscula, minúscula, número e especial (@$!%*?&_-)'
      ),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
    cnh: z
      .string()
      .regex(/^\d{11}$/, 'CNH deve ter exatamente 11 dígitos numéricos'),
    instituicaoId: z
      .number({ required_error: 'Selecione uma instituição' })
      .positive('Selecione uma instituição'),
    miniBiografia: z.string().min(10, 'Bio deve ter ao menos 10 caracteres').max(300),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não conferem',
    path: ['confirmarSenha'],
  });

type FormData = z.infer<typeof schema>;

const formatCpf = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export default function CadastroMotoristaScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [buscaInstituicao, setBuscaInstituicao] = useState('');
  const [resultados, setResultados] = useState<InstituicaoInfo[]>([]);
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [buscando, setBuscando] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      emailPessoal: '',
      emailInstitucional: '',
      cpf: '',
      senha: '',
      confirmarSenha: '',
      cnh: '',
      miniBiografia: '',
    },
  });

  const verificarUsername = useCallback((valor: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!valor || valor.length < 3 || !usernameRegex.test(valor)) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const disponivel = await participanteService.verificarUsername(valor);
        setUsernameStatus(disponivel ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
  }, []);

  const buscarInstituicoes = useCallback(async (termo: string) => {
    if (termo.length < 3) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const lista = await instituicaoService.buscar(termo);
      setResultados(lista);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const selecionarInstituicao = (inst: InstituicaoInfo) => {
    setValue('instituicaoId', inst.id, { shouldValidate: true });
    setNomeInstituicao(`${inst.nome} — ${inst.cidade}/${inst.estado}`);
    setResultados([]);
    setBuscaInstituicao('');
  };

  const limparInstituicao = () => {
    setValue('instituicaoId', undefined as unknown as number);
    setNomeInstituicao('');
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.cadastrarMotorista({
        nome: data.nome,
        username: data.username || undefined,
        emailPessoal: data.emailPessoal,
        emailInstitucional: data.emailInstitucional,
        cpf: data.cpf,
        senha: data.senha,
        cnh: data.cnh,
        instituicaoId: data.instituicaoId,
        miniBiografia: data.miniBiografia,
      });
      router.replace({
        pathname: '/(auth)/verificar-email',
        params: { email: data.emailInstitucional },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro ao realizar cadastro';
      showAlert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cadastro Motorista</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados pessoais e CNH</Text>

          <Controller
            control={control}
            name="nome"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Nome completo"
                value={value}
                onChangeText={onChange}
                placeholder="Seu nome"
                autoCapitalize="words"
                error={errors.nome?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange } }) => (
              <View style={styles.usernameGroup}>
                <Input
                  label="@usuário (opcional)"
                  value={value ?? ''}
                  onChangeText={(text) => {
                    const val = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
                    onChange(val);
                    verificarUsername(val);
                  }}
                  placeholder="ex: joao.silva"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.username?.message}
                />
                {usernameStatus === 'checking' && (
                  <Text style={styles.usernameChecking}>Verificando disponibilidade...</Text>
                )}
                {usernameStatus === 'available' && (
                  <Text style={styles.usernameAvailable}>@{value} disponível</Text>
                )}
                {usernameStatus === 'taken' && (
                  <Text style={styles.usernameTaken}>@{value} já está em uso</Text>
                )}
                <Text style={styles.usernameHint}>
                  Se deixar em branco, será gerado automaticamente a partir do seu nome.
                </Text>
              </View>
            )}
          />

          <Controller
            control={control}
            name="emailPessoal"
            render={({ field: { value, onChange } }) => (
              <Input
                label="E-mail pessoal"
                value={value}
                onChangeText={onChange}
                placeholder="seu@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.emailPessoal?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="emailInstitucional"
            render={({ field: { value, onChange } }) => (
              <Input
                label="E-mail institucional"
                value={value}
                onChangeText={onChange}
                placeholder="seu@universidade.edu.br"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.emailInstitucional?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="cpf"
            render={({ field: { value, onChange } }) => (
              <Input
                label="CPF"
                value={value}
                onChangeText={(text) => onChange(formatCpf(text))}
                placeholder="000.000.000-00"
                keyboardType="numeric"
                error={errors.cpf?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="senha"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Senha"
                value={value}
                onChangeText={onChange}
                placeholder="Maiúsc., minúsc., número e especial"
                secureTextEntry
                error={errors.senha?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmarSenha"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Confirmar senha"
                value={value}
                onChangeText={onChange}
                placeholder="Repita sua senha"
                secureTextEntry
                error={errors.confirmarSenha?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="cnh"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Número da CNH (11 dígitos)"
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 11))}
                placeholder="Ex: 01234567890"
                keyboardType="numeric"
                error={errors.cnh?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="miniBiografia"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Mini biografia"
                value={value}
                onChangeText={onChange}
                placeholder="Conte um pouco sobre você (ao menos 10 caracteres)"
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                error={errors.miniBiografia?.message}
              />
            )}
          />

          {/* Seletor de instituição */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Instituição</Text>

            {nomeInstituicao ? (
              <View style={styles.instituicaoSelecionada}>
                <Text style={styles.instituicaoNome} numberOfLines={2}>
                  {nomeInstituicao}
                </Text>
                <TouchableOpacity onPress={limparInstituicao}>
                  <Ionicons name="close-circle" size={20} color={Colors.TextMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.buscaRow}>
                  <TextInput
                    style={styles.buscaInput}
                    value={buscaInstituicao}
                    onChangeText={setBuscaInstituicao}
                    placeholder="Nome da universidade"
                    placeholderTextColor="#999"
                    onSubmitEditing={() => buscarInstituicoes(buscaInstituicao)}
                  />
                  <TouchableOpacity
                    style={styles.buscaBtn}
                    onPress={() => buscarInstituicoes(buscaInstituicao)}
                    disabled={buscando}
                  >
                    {buscando ? (
                      <ActivityIndicator size="small" color={Colors.TextLight} />
                    ) : (
                      <Text style={styles.buscaBtnText}>Buscar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {resultados.length > 0 && (
                  <View style={styles.resultadosList}>
                    {resultados.map((inst) => (
                      <TouchableOpacity
                        key={inst.id}
                        style={styles.resultadoItem}
                        onPress={() => selecionarInstituicao(inst)}
                      >
                        <Text style={styles.resultadoNome}>{inst.nome}</Text>
                        <Text style={styles.resultadoCidade}>
                          {inst.cidade}/{inst.estado}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {errors.instituicaoId && (
              <Text style={styles.errorText}>{errors.instituicaoId.message}</Text>
            )}
          </View>

          <Button
            title="Cadastrar"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 12,
  },
  backArrow: {
    fontSize: 28,
    color: Colors.TextLight,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.TextLight,
  },
  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.Primary,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  buscaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buscaInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  buscaBtn: {
    backgroundColor: Colors.Primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 72,
    alignItems: 'center',
  },
  buscaBtnText: {
    color: Colors.TextLight,
    fontWeight: '600',
    fontSize: 14,
  },
  resultadosList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultadoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  resultadoNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  resultadoCidade: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  instituicaoSelecionada: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.Primary,
  },
  instituicaoNome: {
    flex: 1,
    fontSize: 14,
    color: Colors.Primary,
    fontWeight: '600',
  },
  limparBtn: {
    fontSize: 16,
    color: '#999',
    paddingLeft: 8,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  usernameGroup: { marginBottom: 4 },
  usernameChecking: { fontSize: 12, color: Colors.TextMuted, marginTop: 4 },
  usernameAvailable: { fontSize: 12, color: Colors.Success, marginTop: 4, fontWeight: '600' },
  usernameTaken: { fontSize: 12, color: Colors.Error, marginTop: 4, fontWeight: '600' },
  usernameHint: { fontSize: 11, color: '#AAA', marginTop: 4 },
});
