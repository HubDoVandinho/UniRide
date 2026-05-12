import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { participanteService } from '@/services/participante.service';
import { EnderecoResponse } from '@/types/api.types';

const enderecoSchema = z.object({
  nome: z.string().min(2, 'Informe um nome para o endereço').max(60),
  cep: z.string().min(8, 'CEP inválido').max(8, 'CEP inválido'),
  rua: z.string().min(2, 'Informe a rua'),
  numero: z.string().optional(),
  bairro: z.string().min(2, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  estado: z.string().min(2, 'Informe o estado').max(2, 'Use a sigla (ex: SP)'),
});

interface ViaCepResponse {
  erro?: boolean;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

type EnderecoFormData = z.infer<typeof enderecoSchema>;

export default function EnderecosScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const [enderecos, setEnderecos] = useState<EnderecoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EnderecoFormData>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: { nome: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' },
  });

  useEffect(() => {
    carregarEnderecos();
  }, []);

  const carregarEnderecos = async () => {
    setLoading(true);
    try {
      const lista = await participanteService.listarEnderecos();
      setEnderecos(lista);
    } catch {
      showAlert('Erro', 'Não foi possível carregar os endereços.');
    } finally {
      setLoading(false);
    }
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    clearErrors('cep');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data: ViaCepResponse = await res.json();

      if (data.erro) {
        setError('cep', { message: 'CEP não encontrado' });
        return;
      }

      setValue('rua', data.logradouro ?? '', { shouldValidate: true });
      setValue('bairro', data.bairro ?? '', { shouldValidate: true });
      setValue('cidade', data.localidade ?? '', { shouldValidate: true });
      setValue('estado', data.uf ?? '', { shouldValidate: true });
    } catch {
      setError('cep', { message: 'Não foi possível buscar o CEP' });
    } finally {
      setBuscandoCep(false);
    }
  };

  const fecharModal = () => {
    setModalVisible(false);
    reset();
  };

  const geocodificarEndereco = async (data: EnderecoFormData): Promise<{ lat: number; lng: number } | null> => {
    const street = [data.rua, data.numero].filter(Boolean).join(' ');
    try {
      // 1ª tentativa: busca estruturada (mais precisa, sem vírgulas duplicadas)
      const params = new URLSearchParams({
        format: 'json', street, city: data.cidade, state: data.estado,
        country: 'Brazil', countrycodes: 'br', limit: '1', addressdetails: '1',
      });
      const res1 = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'pt-BR' },
      });
      const json1 = res1.ok ? await res1.json() : [];
      if (json1.length > 0) return { lat: parseFloat(json1[0].lat), lng: parseFloat(json1[0].lon) };

      // 2ª tentativa: free-form sem bairro
      const q = `${street}, ${data.cidade}, ${data.estado}, Brasil`;
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const json2 = res2.ok ? await res2.json() : [];
      if (json2.length > 0) return { lat: parseFloat(json2[0].lat), lng: parseFloat(json2[0].lon) };

      // 3ª tentativa: CEP como postalcode (sempre indexado no OSM)
      if (data.cep) {
        const cepLimpo = data.cep.replace(/\D/g, '');
        const params3 = new URLSearchParams({
          format: 'json', postalcode: cepLimpo, country: 'Brazil', countrycodes: 'br', limit: '1',
        });
        const res3 = await fetch(`https://nominatim.openstreetmap.org/search?${params3}`, {
          headers: { 'Accept-Language': 'pt-BR' },
        });
        const json3 = res3.ok ? await res3.json() : [];
        if (json3.length > 0) return { lat: parseFloat(json3[0].lat), lng: parseFloat(json3[0].lon) };
      }
    } catch {
      // sem coordenadas — não bloqueia o salvamento
    }
    return null;
  };

  const adicionarEndereco = async (data: EnderecoFormData) => {
    setSalvando(true);
    try {
      const coords = await geocodificarEndereco(data);
      const novo = await participanteService.adicionarEndereco({
        ...data,
        nome: data.nome,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setEnderecos((prev) => [...prev, novo]);
      fecharModal();
    } catch {
      showAlert('Erro', 'Não foi possível adicionar o endereço.');
    } finally {
      setSalvando(false);
    }
  };

  const removerEndereco = (id: number) => {
    showAlert('Remover endereço', 'Deseja remover este endereço?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await participanteService.removerEndereco(id);
            setEnderecos((prev) => prev.filter((e) => e.id !== id));
          } catch {
            showAlert('Erro', 'Não foi possível remover o endereço.');
          }
        },
      },
    ]);
  };

  const renderEndereco = ({ item }: { item: EnderecoResponse }) => (
    <View style={styles.enderecoCard}>
      <View style={styles.enderecoCardHeader}>
        <View style={styles.enderecoIconWrap}>
          <Ionicons name="location-outline" size={24} color={Colors.Primary} />
        </View>
        <TouchableOpacity onPress={() => removerEndereco(item.id)} style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={20} color={Colors.Error} />
        </TouchableOpacity>
      </View>

      {item.nome ? <Text style={styles.enderecoLabel}>{item.nome}</Text> : null}
      <Text style={styles.enderecoRua}>
        {item.rua}{item.numero ? `, ${item.numero}` : ''}
      </Text>
      <Text style={styles.enderecoBairro}>{item.bairro}</Text>

      <View style={styles.enderecoDivider} />

      <View style={styles.enderecoBadgesRow}>
        <View style={styles.enderecoBadge}>
          <Ionicons name="map-outline" size={13} color={Colors.Primary} />
          <Text style={styles.enderecoBadgeText}>{item.cidade} — {item.estado}</Text>
        </View>
        <View style={styles.enderecoBadge}>
          <Ionicons name="mail-outline" size={13} color={Colors.Primary} />
          <Text style={styles.enderecoBadgeText}>{item.cep}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Meus Endereços</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.Primary} size="large" />
          </View>
        ) : enderecos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
            <Button
              title="Adicionar endereço"
              onPress={() => setModalVisible(true)}
              variant="primary"
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <FlatList
            data={enderecos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEndereco}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal adicionar endereço */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={fecharModal}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={fecharModal} style={styles.modalBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Novo Endereço</Text>
              <Text style={styles.modalSubtitle}>Informe os dados do endereço</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formSecaoLabel}>Identificação</Text>
              <Controller
                control={control}
                name="nome"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Nome"
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="Ex: Casa, Trabalho, Academia..."
                    autoCapitalize="words"
                    error={errors.nome?.message}
                  />
                )}
              />

              <View style={styles.formDivider} />
              <Text style={styles.formSecaoLabel}>Localização</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputFlex}>
                  <Controller
                    control={control}
                    name="cep"
                    render={({ field: { value, onChange } }) => (
                      <View>
                        <Input
                          label="CEP"
                          value={value}
                          onChangeText={(text) => {
                            const soNumeros = text.replace(/\D/g, '').slice(0, 8);
                            onChange(soNumeros);
                            if (soNumeros.length === 8) buscarCep(soNumeros);
                          }}
                          keyboardType="numeric"
                          placeholder="00000000"
                          error={errors.cep?.message}
                        />
                        {buscandoCep && (
                          <View style={styles.cepLoadingRow}>
                            <ActivityIndicator size="small" color={Colors.Primary} />
                            <Text style={styles.cepLoadingText}>Buscando...</Text>
                          </View>
                        )}
                      </View>
                    )}
                  />
                </View>
                <View style={styles.inputFlex}>
                  <Controller
                    control={control}
                    name="numero"
                    render={({ field: { value, onChange } }) => (
                      <Input
                        label="Número"
                        value={value}
                        onChangeText={(t) => onChange(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        error={errors.numero?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="rua"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Rua"
                    value={value}
                    onChangeText={onChange}
                    error={errors.rua?.message}
                    autoCapitalize="words"
                  />
                )}
              />

              <Controller
                control={control}
                name="bairro"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Bairro"
                    value={value}
                    onChangeText={onChange}
                    error={errors.bairro?.message}
                    autoCapitalize="words"
                  />
                )}
              />

              <View style={styles.inputRow}>
                <View style={[styles.inputFlex, { flex: 2 }]}>
                  <Controller
                    control={control}
                    name="cidade"
                    render={({ field: { value, onChange } }) => (
                      <Input
                        label="Cidade"
                        value={value}
                        onChangeText={onChange}
                        error={errors.cidade?.message}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>
                <View style={styles.inputFlex}>
                  <Controller
                    control={control}
                    name="estado"
                    render={({ field: { value, onChange } }) => (
                      <Input
                        label="Estado"
                        value={value}
                        onChangeText={onChange}
                        placeholder="SP"
                        error={errors.estado?.message}
                        autoCapitalize="characters"
                      />
                    )}
                  />
                </View>
              </View>

              <View style={styles.formDivider} />
              <Button
                title="Salvar endereço"
                onPress={handleSubmit(adicionarEndereco)}
                variant="primary"
                loading={salvando}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* FAB — Adicionar endereço */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.SurfaceLight,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn: { padding: 4 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.Primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: Colors.TextMuted,
    marginBottom: 20,
  },
  emptyButton: { width: 220, marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.Primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  list: {
    gap: 16,
    paddingBottom: 88,
  },
  enderecoCard: {
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  enderecoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  enderecoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.Primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    padding: 6,
  },
  enderecoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.Primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  enderecoRua: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.Text,
    marginBottom: 3,
  },
  enderecoBairro: {
    fontSize: 13,
    color: Colors.TextMuted,
    marginBottom: 0,
  },
  enderecoDivider: {
    height: 1,
    backgroundColor: Colors.Primary + '20',
    marginVertical: 14,
  },
  enderecoBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  enderecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.Primary + '12',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  enderecoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Primary,
  },
  modalSafeArea: { flex: 1, backgroundColor: Colors.Background },
  modalScroll:   { padding: 20, flexGrow: 1 },
  modalHeader:   { paddingBottom: 20 },
  modalBackBtn:  { padding: 4, marginBottom: 8, alignSelf: 'flex-start' },
  modalTitle:    { fontSize: 22, fontWeight: '800', color: Colors.TextLight },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  formCard: {
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formSecaoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.Primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 14,
  },
  formDivider: {
    height: 1,
    backgroundColor: Colors.Primary + '20',
    marginVertical: 16,
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputFlex: { flex: 1 },
  cepLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 8,
  },
  cepLoadingText: {
    fontSize: 12,
    color: Colors.Primary,
  },
});
