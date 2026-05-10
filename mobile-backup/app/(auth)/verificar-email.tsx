import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { authService } from '@/services/auth.service';

const COOLDOWN_SEGUNDOS = 60;

const PASSOS = [
  { icon: 'mail-open-outline' as const,      texto: 'Abra seu e-mail institucional' },
  { icon: 'alert-circle-outline' as const,   texto: 'Verifique também a pasta de spam' },
  { icon: 'finger-print-outline' as const,   texto: 'Clique em "Ativar minha conta"' },
  { icon: 'log-in-outline' as const,         texto: 'Volte aqui e faça login' },
];

export default function VerificarEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const iniciarCooldown = () => {
    setCooldown(COOLDOWN_SEGUNDOS);
    intervalRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleReenviar = async () => {
    if (!email || cooldown > 0 || enviando) return;
    setEnviando(true);
    setMensagem(null);
    try {
      await authService.reenviarVerificacao(email);
      setMensagem({ texto: 'Novo link enviado! Verifique sua caixa de entrada e a pasta de spam.', erro: false });
      iniciarCooldown();
    } catch {
      setMensagem({ texto: 'Não foi possível reenviar. Tente novamente em instantes.', erro: true });
    } finally {
      setEnviando(false);
    }
  };

  const podReenviar = !enviando && cooldown === 0;

  return (
    <SafeAreaView style={styles.safe}>
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

          {/* Ícone */}
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={36} color={Colors.Primary} />
          </View>

          <Text style={styles.titulo}>Verifique seu e-mail</Text>

          <Text style={styles.descricao}>
            Enviamos um link de ativação para:
          </Text>
          {email ? (
            <Text style={styles.emailDestaque}>{email}</Text>
          ) : null}

          {/* Passos */}
          <View style={styles.passos}>
            {PASSOS.map((p, i) => (
              <View key={i} style={styles.passoRow}>
                <View style={styles.passoIconWrap}>
                  <Ionicons name={p.icon} size={18} color={Colors.Primary} />
                </View>
                <Text style={styles.passoTexto}>{p.texto}</Text>
              </View>
            ))}
          </View>

          {/* Feedback reenvio */}
          {mensagem ? (
            <View style={[styles.mensagemBox, mensagem.erro && styles.mensagemBoxErro]}>
              <Ionicons
                name={mensagem.erro ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={16}
                color={mensagem.erro ? Colors.Error : Colors.Success}
              />
              <Text style={[styles.mensagemText, mensagem.erro && styles.mensagemTextErro]}>
                {mensagem.texto}
              </Text>
            </View>
          ) : null}

          {/* Botão reenviar */}
          <TouchableOpacity
            style={[styles.btnReenviar, !podReenviar && styles.btnReenviarDisabled]}
            onPress={handleReenviar}
            disabled={!podReenviar}
            activeOpacity={0.7}
          >
            {enviando ? (
              <ActivityIndicator color={Colors.Primary} size="small" />
            ) : (
              <>
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color={podReenviar ? Colors.Primary : Colors.TextMuted}
                />
                <Text style={[styles.btnReenviarText, !podReenviar && styles.btnReenviarTextMuted]}>
                  {cooldown > 0
                    ? `Reenviar e-mail (${cooldown}s)`
                    : 'Não recebi o e-mail — reenviar'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Botão login */}
          <TouchableOpacity
            style={styles.btnLogin}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnLoginText}>Já ativei minha conta — fazer login</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.Background },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  // Logo
  logoArea:    { alignItems: 'center', marginBottom: 32 },
  logoText:    { fontSize: 42, fontWeight: '800', color: Colors.TextLight, letterSpacing: 2 },
  logoSubtitle:{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Card
  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },

  // Ícone
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Textos
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.Text,
    marginBottom: 8,
    textAlign: 'center',
  },
  descricao: {
    fontSize: 14,
    color: Colors.TextMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailDestaque: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.Primary,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },

  // Passos
  passos: { width: '100%', gap: 10, marginBottom: 24 },
  passoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.SurfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  passoTexto: {
    flex: 1,
    fontSize: 13,
    color: Colors.Text,
    lineHeight: 18,
  },

  // Mensagem feedback
  mensagemBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.Success + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  mensagemBoxErro: { backgroundColor: Colors.Error + '12' },
  mensagemText: {
    flex: 1, fontSize: 13, color: Colors.Success, lineHeight: 18,
  },
  mensagemTextErro: { color: Colors.Error },

  // Botões
  btnReenviar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.Primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 10,
  },
  btnReenviarDisabled: { borderColor: Colors.SurfaceLight },
  btnReenviarText:     { fontSize: 14, fontWeight: '600', color: Colors.Primary },
  btnReenviarTextMuted:{ color: Colors.TextMuted },

  btnLogin: {
    backgroundColor: Colors.Primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  btnLoginText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
