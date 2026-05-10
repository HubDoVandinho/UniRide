import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  login: z
    .string()
    .min(1, 'E-mail ou username obrigatório'),
  senha: z
    .string()
    .min(6, 'Senha deve ter ao menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', senha: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.login, data.senha);
      router.replace('/(app)');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro ao fazer login';
      showAlert('Erro', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>UniRide</Text>
          <Text style={styles.logoSubtitle}>Caronas universitárias</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar</Text>

          <Controller
            control={control}
            name="login"
            render={({ field: { value, onChange } }) => (
              <Input
                label="E-mail ou username"
                value={value}
                onChangeText={onChange}
                placeholder="seu@email.com ou @usuario"
                autoCapitalize="none"
                error={errors.login?.message}
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
                placeholder="••••••••"
                secureTextEntry
                error={errors.senha?.message}
              />
            )}
          />

          <Button
            title="Entrar"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            loading={isLoading}
            style={styles.loginButton}
          />

          <TouchableOpacity style={styles.forgotLink} onPress={() => router.push('/(auth)/esqueci-senha')}>
            <Text style={styles.linkText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        {/* Cadastro */}
        {alertModal}

        <TouchableOpacity
          onPress={() => router.push('/(auth)/cadastro-passageiro')}
          style={styles.signupLink}
        >
          <Text style={styles.signupText}>
            Não possui uma conta?{' '}
            <Text style={styles.signupHighlight}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.TextLight,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.Primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 4,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: Colors.Primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  signupHighlight: {
    color: Colors.TextLight,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
