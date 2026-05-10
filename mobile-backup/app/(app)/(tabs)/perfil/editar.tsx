import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth.store';
import { participanteService } from '@/services/participante.service';


const usernameRegex = /^[a-z][a-z0-9._]{2,29}$/;

const editarSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-z][a-z0-9._]{2,29}$/, 'Use letras minúsculas, números, pontos ou _'),
  miniBiografia: z.string().max(200, 'Máximo 200 caracteres').optional(),
});

type EditarFormData = z.infer<typeof editarSchema>;

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const floatBarHeight = 50 + 12 + Math.max(bottomInset, 16) + 12;
  const [loading, setLoading] = useState(false);
  const { showAlert, alertModal } = useAppAlert();

  const [apagarModalVisible, setApagarModalVisible] = useState(false);
  const [senha, setSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [deletando, setDeletando] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verificarUsername = useCallback((valor: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (valor === user?.username) { setUsernameStatus('idle'); return; }
    if (!valor || valor.length < 3 || !usernameRegex.test(valor)) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const disponivel = await participanteService.verificarUsername(valor);
        setUsernameStatus(disponivel ? 'available' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 500);
  }, [user?.username]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditarFormData>({
    resolver: zodResolver(editarSchema),
    defaultValues: {
      nome: user?.nome ?? '',
      username: user?.username ?? '',
      miniBiografia: user?.miniBiografia ?? '',
    },
  });

  // ── Perfil ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: EditarFormData) => {
    if (usernameStatus === 'taken') {
      showAlert('Erro', 'Este nome de usuário já está em uso. Escolha outro.');
      return;
    }
    setLoading(true);
    try {
      const updated = await participanteService.atualizarPerfil({
        nome: data.nome,
        username: data.username,
        miniBiografia: data.miniBiografia,
      });
      setUser(updated);
      showAlert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', style: 'default', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalApagar = () => {
    setSenha('');
    setSenhaErro('');
    setApagarModalVisible(true);
  };

  const fecharModalApagar = () => {
    if (deletando) return;
    setApagarModalVisible(false);
  };

  const handleApagarConta = async () => {
    if (!senha.trim()) { setSenhaErro('Digite sua senha para confirmar.'); return; }
    setSenhaErro('');
    setDeletando(true);
    try {
      await participanteService.apagarConta(senha);
      setApagarModalVisible(false);
      await logout();
      router.replace('/(auth)/login');
    } catch {
      setSenhaErro('Senha incorreta ou erro ao apagar a conta.');
    } finally {
      setDeletando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: floatBarHeight + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Editar Perfil</Text>
        </View>

        {/* ── Dados básicos ─────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="person-outline" size={26} color={Colors.Primary} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Dados do perfil</Text>
              <Text style={styles.cardSub}>Nome, username e bio</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <Controller
            control={control}
            name="nome"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Nome completo"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                error={errors.nome?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange } }) => (
              <View>
                <Input
                  label="Nome de usuário"
                  value={value}
                  onChangeText={(t) => { const v = t.toLowerCase(); onChange(v); verificarUsername(v); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="ex: joao.silva"
                  error={errors.username?.message}
                  borderColor={
                    usernameStatus === 'available' ? Colors.Success :
                    usernameStatus === 'taken' ? Colors.Error :
                    undefined
                  }
                />
                {usernameStatus === 'available' && <Text style={styles.usernameAvailable}>@{value} disponível</Text>}
                {usernameStatus === 'taken'     && <Text style={styles.usernameTaken}>@{value} já está em uso</Text>}
                {usernameStatus === 'checking'  && <Text style={styles.usernameChecking}>Verificando...</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="miniBiografia"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Sobre mim"
                value={value ?? ''}
                onChangeText={(t) => onChange(t.slice(0, 200))}
                placeholder="Uma breve descrição sobre você..."
                multiline
                numberOfLines={4}
                error={errors.miniBiografia?.message}
              />
            )}
          />

          <View style={styles.cardDivider} />
          <Text style={styles.cardSecaoLabel}>Contato</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="mail-outline" size={16} color={Colors.Primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>E-mail</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user?.emailPessoal}</Text>
            </View>
          </View>

          {user?.emailInstitucional && (
            <>
              <View style={styles.infoSep} />
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="school-outline" size={16} color={Colors.Primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>E-mail institucional</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user.emailInstitucional}</Text>
              </View>
            </View>
            </>
          )}
        </View>

        {/* ── Preferências e Endereços ──────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/perfil/preferencias')}
            activeOpacity={0.75}
          >
            <Ionicons name="heart-outline" size={20} color={Colors.Primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Preferências de viagem</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionItem, styles.actionItemLast]}
            onPress={() => router.push('/perfil/enderecos')}
            activeOpacity={0.75}
          >
            <Ionicons name="home-outline" size={20} color={Colors.Primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Meus endereços</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Apagar conta ─────────────────────────────────── */}
        <View style={styles.deleteZoneCard}>
          <View style={styles.deleteZoneHeader}>
            <View style={styles.deleteZoneIconWrap}>
              <Ionicons name="trash-outline" size={20} color={Colors.Error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteZoneTitle}>Encerrar conta</Text>
              <Text style={styles.deleteZoneSub}>
                Esta ação é permanente e não pode ser desfeita.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteZoneBtn} onPress={abrirModalApagar} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={16} color={Colors.Error} />
            <Text style={styles.deleteZoneBtnText}>Apagar minha conta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Botão fixo no rodapé ──────────────────────────── */}
      <View style={[styles.floatSaveBar, { paddingBottom: Math.max(bottomInset, 16) }]}>
        <Button
          title="Salvar perfil"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          loading={loading}
          style={styles.floatSaveBtn}
        />
      </View>

      {alertModal}

      {/* Modal apagar conta */}
      <Modal
        visible={apagarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={fecharModalApagar}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={32} color={Colors.Error} />
            </View>
            <Text style={styles.modalTitle}>Apagar conta</Text>
            <Text style={styles.modalMessage}>
              Esta ação é{' '}
              <Text style={styles.modalMessageBold}>permanente e irreversível.</Text>
              {'\n\n'}
              Todos os seus dados serão excluídos: perfil, endereços, veículos, preferências e amizades.
            </Text>
            <Text style={styles.modalInputLabel}>Digite sua senha para confirmar</Text>
            <TextInput
              style={[styles.modalInput, senhaErro ? styles.modalInputError : null]}
              value={senha}
              onChangeText={(v) => { setSenha(v); setSenhaErro(''); }}
              placeholder="Sua senha"
              placeholderTextColor={Colors.TextMuted}
              secureTextEntry
              autoCapitalize="none"
              editable={!deletando}
            />
            {senhaErro ? <Text style={styles.modalErro}>{senhaErro}</Text> : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={fecharModalApagar}
                disabled={deletando}
                activeOpacity={0.75}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDestructive, deletando && styles.modalBtnDisabled]}
                onPress={handleApagarConta}
                disabled={deletando}
                activeOpacity={0.75}
              >
                {deletando
                  ? <ActivityIndicator size="small" color={Colors.TextLight} />
                  : <Text style={styles.modalBtnDestructiveText}>Apagar conta</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },
  scroll:   { flexGrow: 1, padding: 20, gap: 12 },
  header:   { marginBottom: 8 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: 26, fontWeight: '800', color: Colors.Primary },

  card: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 0,
  },
  cardIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: Colors.Primary },
  cardSub:   { fontSize: 12, color: Colors.TextMuted, marginTop: 1 },
  cardDivider: {
    height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 16,
  },
  cardSecaoLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.Primary,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.Primary + '12',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: { fontSize: 11, color: Colors.TextMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: Colors.Text, fontWeight: '600', marginTop: 1 },
  infoSep: { height: 1, backgroundColor: Colors.Primary + '15', marginBottom: 12 },
  floatSaveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: 'rgba(245,245,250,0.92)',
  },
  floatSaveBtn: { minHeight: 50 },
  deleteZoneCard: {
    backgroundColor: Colors.Surface, borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: Colors.Error + '33',
    shadowColor: Colors.Error, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  deleteZoneHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  deleteZoneIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.Error + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteZoneTitle: { fontSize: 15, fontWeight: '700', color: Colors.Error, marginBottom: 2 },
  deleteZoneSub:   { fontSize: 13, color: Colors.TextMuted, lineHeight: 18 },
  deleteZoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.Error, borderRadius: 14,
    paddingVertical: 12,
  },
  deleteZoneBtnText: { fontSize: 14, fontWeight: '700', color: Colors.Error },

  section: {
    backgroundColor: Colors.Surface, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight,
  },
  actionItemLast: { borderBottomWidth: 0 },
  actionIcon:     { marginRight: 12, width: 28, textAlign: 'center' },
  actionText:     { flex: 1, fontSize: 15, color: Colors.Text, fontWeight: '500' },

  usernameAvailable: { fontSize: 12, color: Colors.Success, marginTop: 2, marginLeft: 4 },
  usernameTaken:     { fontSize: 12, color: Colors.Error, marginTop: 2, marginLeft: 4 },
  usernameChecking:  { fontSize: 12, color: Colors.TextMuted, marginTop: 2, marginLeft: 4 },

  // Modal apagar
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard:        { width: '100%', backgroundColor: Colors.Surface, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  modalIconWrap:    { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.Error + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle:       { fontSize: 18, fontWeight: '800', color: Colors.Text, textAlign: 'center', marginBottom: 10 },
  modalMessage:     { fontSize: 14, color: Colors.TextMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalMessageBold: { fontWeight: '700', color: Colors.Error },
  modalInputLabel:  { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: Colors.TextMuted, marginBottom: 6 },
  modalInput:       { width: '100%', borderWidth: 1.5, borderColor: Colors.SurfaceLight, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: Colors.Text, backgroundColor: Colors.SurfaceLight },
  modalInputError:  { borderColor: Colors.Error },
  modalErro:        { alignSelf: 'flex-start', fontSize: 12, color: Colors.Error, marginTop: 4 },
  modalButtons:     { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  modalBtn:         { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalBtnCancel:   { backgroundColor: Colors.SurfaceLight },
  modalBtnCancelText:       { fontSize: 15, fontWeight: '700', color: Colors.TextMuted },
  modalBtnDestructive:      { backgroundColor: Colors.Error },
  modalBtnDestructiveText:  { fontSize: 15, fontWeight: '700', color: Colors.TextLight },
  modalBtnDisabled: { opacity: 0.6 },
});
