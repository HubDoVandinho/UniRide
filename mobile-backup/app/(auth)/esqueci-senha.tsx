import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAppAlert } from '@/hooks/useAppAlert';
import api from '@/services/api';

// ── Schemas ───────────────────────────────────────────────────────────────────

const schemaEmail = z.object({
  email: z.string().email('Informe um e-mail válido'),
});

const schemaCodigo = z.object({
  codigo: z.string().length(6, 'O código tem 6 dígitos'),
  novaSenha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmarSenha: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((d) => d.novaSenha === d.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

type EmailForm  = z.infer<typeof schemaEmail>;
type CodigoForm = z.infer<typeof schemaCodigo>;

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function EsqueciSenhaScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [carregando, setCarregando] = useState(false);

  // Formulário step 1
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(schemaEmail),
    defaultValues: { email: '' },
  });

  // Formulário step 2
  const codigoForm = useForm<CodigoForm>({
    resolver: zodResolver(schemaCodigo),
    defaultValues: { codigo: '', novaSenha: '', confirmarSenha: '' },
  });

  const enviarCodigo = async (data: EmailForm) => {
    setCarregando(true);
    try {
      await api.post('/api/v1/auth/esqueci-senha', { email: data.email });
      setEtapa('codigo');
    } catch {
      // Resposta genérica por segurança — não revelamos se o e-mail existe
      setEtapa('codigo');
    } finally {
      setCarregando(false);
    }
  };

  const redefinirSenha = async (data: CodigoForm) => {
    setCarregando(true);
    try {
      await api.post('/api/v1/auth/redefinir-senha', {
        codigo: data.codigo,
        novaSenha: data.novaSenha,
      });
      showAlert('Senha redefinida!', 'Sua senha foi alterada com sucesso. Faça login com a nova senha.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: unknown) {
      showAlert('Código inválido', e instanceof Error ? e.message : 'O código pode estar errado ou expirado. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {alertModal}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.TextLight} />
          </TouchableOpacity>

          {/* Ícone flutuante — fora do card */}
          <View style={styles.iconArea}>
            <View style={styles.iconWrapper}>
              <Ionicons name="lock-open-outline" size={40} color={Colors.Primary} />
            </View>
          </View>

          {/* Card branco — título, subtítulo e form */}
          <View style={styles.card}>
            <Text style={styles.titulo}>Recuperar acesso</Text>
            <Text style={styles.subtitulo}>
              {etapa === 'email'
                ? 'Informe seu e-mail para receber o código de recuperação.'
                : 'Digite o código de 6 dígitos enviado para o seu e-mail e escolha uma nova senha.'}
            </Text>

            {/* ── Step 1: E-mail ─────────────────────────── */}
            {etapa === 'email' && (
              <View style={styles.form}>
                <Controller
                  control={emailForm.control}
                  name="email"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="E-mail"
                      value={value}
                      onChangeText={onChange}
                      placeholder="seu@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={emailForm.formState.errors.email?.message}
                    />
                  )}
                />
                <Button
                  title={carregando ? '' : 'Enviar código'}
                  onPress={emailForm.handleSubmit(enviarCodigo)}
                  variant="primary"
                  style={styles.btn}
                  disabled={carregando}
                >
                  {carregando && <ActivityIndicator color="#fff" />}
                </Button>
              </View>
            )}

            {/* ── Step 2: Código + Nova senha ────────────── */}
            {etapa === 'codigo' && (
              <View style={styles.form}>
                <View style={styles.infoBanner}>
                  <Ionicons name="mail-outline" size={16} color={Colors.Primary} style={{ marginRight: 6 }} />
                  <Text style={styles.infoBannerText}>
                    Se o e-mail estiver cadastrado, você receberá o código em instantes. Verifique também a caixa de spam.
                  </Text>
                </View>

                <Controller
                  control={codigoForm.control}
                  name="codigo"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="Código de 6 dígitos"
                      value={value}
                      onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      keyboardType="numeric"
                      error={codigoForm.formState.errors.codigo?.message}
                    />
                  )}
                />

                <Controller
                  control={codigoForm.control}
                  name="novaSenha"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="Nova senha"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Mínimo 6 caracteres"
                      secureTextEntry
                      error={codigoForm.formState.errors.novaSenha?.message}
                    />
                  )}
                />

                <Controller
                  control={codigoForm.control}
                  name="confirmarSenha"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="Confirmar nova senha"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Repita a nova senha"
                      secureTextEntry
                      error={codigoForm.formState.errors.confirmarSenha?.message}
                    />
                  )}
                />

                <Button
                  title={carregando ? '' : 'Redefinir senha'}
                  onPress={codigoForm.handleSubmit(redefinirSenha)}
                  variant="primary"
                  style={styles.btn}
                  disabled={carregando}
                >
                  {carregando && <ActivityIndicator color="#fff" />}
                </Button>

                <TouchableOpacity style={styles.reenviarBtn} onPress={() => setEtapa('email')}>
                  <Text style={styles.reenviarText}>Não recebeu? Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.Background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 16 },

  iconArea: { alignItems: 'center', marginBottom: 20 },
  iconWrapper: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.Surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },

  card: {
    backgroundColor: Colors.Surface, borderRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },

  titulo:    { fontSize: 24, fontWeight: '800', color: Colors.Primary, marginBottom: 6, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: Colors.TextMuted, lineHeight: 20, textAlign: 'center', marginBottom: 20 },

  form: { gap: 4 },
  btn:  { marginTop: 12 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.Primary + '0D', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.Primary + '30',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: Colors.TextMuted, lineHeight: 18 },

  reenviarBtn:  { alignItems: 'center', paddingVertical: 14 },
  reenviarText: { fontSize: 14, color: Colors.Primary, textDecorationLine: 'underline' },
});
