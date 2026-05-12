import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { participanteService } from '@/services/participante.service';
import { TipoPreferenciaResponse } from '@/types/api.types';
import { useAuthStore } from '@/stores/auth.store';

const MAX_CUSTOM = 10;
const MAX_CHARS  = 20;

export default function PreferenciasScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const { user, setUser } = useAuthStore();

  const [tipos, setTipos] = useState<TipoPreferenciaResponse[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [customPrefs, setCustomPrefs] = useState<TipoPreferenciaResponse[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Campo de criação de preferência custom
  const [novaCustom, setNovaCustom] = useState('');
  const [criando, setCriando] = useState(false);
  const [removendo, setRemovendo] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  const destinatario = user?.tipo === 'MOTORISTA' ? 'MOTORISTA' : 'PASSAGEIRO';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoadingInit(true);
    try {
      const [todosTipos, minhasPrefs] = await Promise.all([
        participanteService.listarTiposPreferencias(destinatario),
        participanteService.listarPreferencias(),
      ]);
      setTipos(todosTipos);
      const globais = minhasPrefs.filter((p) => !p.custom);
      const custom  = minhasPrefs.filter((p) => p.custom);
      setSelecionadas(new Set(globais.map((p) => p.id)));
      setCustomPrefs(custom);
    } catch {
      // começa sem seleção em caso de falha
    } finally {
      setLoadingInit(false);
    }
  };

  const togglePreferencia = (id: number) => {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await participanteService.atualizarPreferencias(Array.from(selecionadas));
      const globaisSelecionadas = tipos.filter(t => selecionadas.has(t.id));
      if (user) setUser({ ...user, preferencias: [...globaisSelecionadas, ...customPrefs] });
      showAlert('Salvo!', 'Suas preferências foram atualizadas.', [
        { text: 'OK', style: 'default', onPress: () => router.back() },
      ]);
    } catch {
      showAlert('Erro', 'Não foi possível salvar as preferências.');
    } finally {
      setSalvando(false);
    }
  };

  const adicionarCustom = async () => {
    const nome = novaCustom.trim();
    if (!nome) return;
    if (customPrefs.length >= MAX_CUSTOM) {
      showAlert('Limite atingido', `Você pode ter no máximo ${MAX_CUSTOM} preferências personalizadas.`);
      return;
    }
    setCriando(true);
    try {
      const criada = await participanteService.criarPreferenciaCustom(nome);
      setCustomPrefs((prev) => [...prev, criada]);
      if (user) setUser({ ...user, preferencias: [...(user.preferencias ?? []), criada] });
      setNovaCustom('');
      inputRef.current?.blur();
    } catch (e: unknown) {
      showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a preferência.');
    } finally {
      setCriando(false);
    }
  };

  const removerCustom = async (pref: TipoPreferenciaResponse) => {
    setRemovendo(pref.id);
    try {
      await participanteService.deletarPreferenciaCustom(pref.id);
      setCustomPrefs((prev) => prev.filter((p) => p.id !== pref.id));
      if (user) setUser({ ...user, preferencias: (user.preferencias ?? []).filter(p => p.id !== pref.id) });
    } catch {
      showAlert('Erro', 'Não foi possível remover a preferência.');
    } finally {
      setRemovendo(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Preferências de viagem</Text>
          <Text style={styles.subtitle}>
            Selecione as preferências que melhor descrevem você como viajante.
          </Text>
        </View>

        <View style={styles.card}>
          {loadingInit ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.Primary} size="large" />
            </View>
          ) : (
            <>
              {/* ── Preferências globais ────────────────────────── */}
              <View style={styles.chipsContainer}>
                {tipos.map((tipo) => {
                  const selected = selecionadas.has(tipo.id);
                  return (
                    <TouchableOpacity
                      key={tipo.id}
                      onPress={() => togglePreferencia(tipo.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {tipo.nome}
                      </Text>
                      {selected && <Text style={styles.chipCheck}> ✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Preferências personalizadas ─────────────────── */}
              <View style={styles.customSection}>
                <Text style={styles.customLabel}>Personalizadas</Text>
                <Text style={styles.customSub}>
                  Crie suas próprias tags para exibir no perfil. Máximo de {MAX_CUSTOM}, com até {MAX_CHARS} caracteres cada.
                </Text>

                {/* Chips das custom existentes */}
                {customPrefs.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {customPrefs.map((pref) => (
                      <View key={pref.id} style={styles.chipCustom}>
                        <Text style={styles.chipCustomText}>{pref.nome}</Text>
                        <TouchableOpacity
                          onPress={() => removerCustom(pref)}
                          disabled={removendo === pref.id}
                          style={styles.chipRemoveBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          {removendo === pref.id
                            ? <ActivityIndicator size={12} color={Colors.Primary} />
                            : <Ionicons name="close" size={13} color={Colors.Primary} />}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Campo para adicionar nova */}
                {customPrefs.length < MAX_CUSTOM && (
                  <View style={styles.addRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.addInput}
                      value={novaCustom}
                      onChangeText={(t) => setNovaCustom(t.slice(0, MAX_CHARS))}
                      placeholder="Ex: Não fumo, Gosto de música..."
                      placeholderTextColor="#999"
                      maxLength={MAX_CHARS}
                      returnKeyType="done"
                      onSubmitEditing={adicionarCustom}
                    />
                    <Text style={styles.charCount}>{novaCustom.length}/{MAX_CHARS}</Text>
                    <TouchableOpacity
                      style={[styles.addBtn, (!novaCustom.trim() || criando) && styles.addBtnDisabled]}
                      onPress={adicionarCustom}
                      disabled={!novaCustom.trim() || criando}
                    >
                      {criando
                        ? <ActivityIndicator size={16} color="#fff" />
                        : <Ionicons name="add" size={20} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          <View style={styles.formDivider} />
          <Button
            title="Salvar preferências"
            onPress={salvar}
            variant="primary"
            loading={salvando}
            disabled={loadingInit}
          />
        </View>
      </ScrollView>
      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.Background },
  scroll:   { flexGrow: 1, padding: 20, paddingBottom: 24 },

  header:    { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backBtn:   { padding: 4 },
  title:     { fontSize: 26, fontWeight: '800', color: Colors.TextLight, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },

  card: {
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },

  formDivider: { height: 1, backgroundColor: Colors.Primary + '20', marginVertical: 16 },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },

  chip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1.5, borderColor: Colors.Primary, backgroundColor: Colors.Surface },
  chipSelected: { backgroundColor: Colors.Primary },
  chipText:     { color: Colors.Primary, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: Colors.TextLight },
  chipCheck:    { color: Colors.TextLight, fontWeight: '700', fontSize: 14 },

  // ── Custom section
  customSection: { marginTop: 24, marginBottom: 20 },
  customLabel:   { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 4 },
  customSub:     { fontSize: 13, color: Colors.TextMuted, marginBottom: 16, lineHeight: 18 },

  chipCustom:    { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 8, paddingVertical: 9, borderRadius: 25, borderWidth: 1.5, borderColor: Colors.Primary, backgroundColor: Colors.Surface, gap: 6 },
  chipCustomText:{ color: Colors.Primary, fontSize: 14, fontWeight: '500' },
  chipRemoveBtn: { padding: 2 },

  addRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  addInput:      { flex: 1, backgroundColor: Colors.Surface, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.Text },
  charCount:     { fontSize: 11, color: Colors.TextMuted, minWidth: 32, textAlign: 'center' },
  addBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled:{ opacity: 0.4 },

});
