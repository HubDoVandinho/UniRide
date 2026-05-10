import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { amizadeService } from '@/services/amizade.service';
import { useAuthStore } from '@/stores/auth.store';
import { AmizadeResponse, PerfilPublicoResponse } from '@/types/api.types';

export default function AmigosMotoristasScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const [motoristas, setMotoristas] = useState<PerfilPublicoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const amizades: AmizadeResponse[] = await amizadeService.listarAmigos();
      // Extrai o perfil do amigo (pode ser solicitante ou destinatário)
      const amigosMotoristas = amizades
        .map((a): PerfilPublicoResponse =>
          a.solicitante.id === user?.id ? a.destinatario : a.solicitante
        )
        .filter((p) => p.tipo === 'MOTORISTA');
      setMotoristas(amigosMotoristas);
    } catch {
      showAlert('Erro', 'Não foi possível carregar seus amigos motoristas.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirAgenda = (motorista: PerfilPublicoResponse) => {
    router.push({
      pathname: '/(app)/agenda-motorista',
      params: { motoristaId: motorista.id, motoristaNome: motorista.nome },
    });
  };

  const renderMotorista = ({ item }: { item: PerfilPublicoResponse }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirAgenda(item)} activeOpacity={0.8}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nome}>{item.nome}</Text>
        {item.instituicao && <Text style={styles.instituicao}>{item.instituicao}</Text>}
        {item.avaliacaoMedia != null && (
          <Text style={styles.avaliacao}>⭐ {item.avaliacaoMedia.toFixed(1)}</Text>
        )}
      </View>
      <Text style={styles.seta}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Amigos Motoristas</Text>
          <Text style={styles.subtitle}>
            Toque em um amigo para ver o calendário de caronas dele.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.Primary} size="large" />
          </View>
        ) : motoristas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhum motorista na lista</Text>
            <Text style={styles.emptySubtitle}>
              Adicione amigos motoristas pela tela de comunidade para ver as caronas deles.
            </Text>
          </View>
        ) : (
          <FlatList
            data={motoristas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMotorista}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={carregar}
            refreshing={loading}
          />
        )}
      </View>
      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20 },
  backBtn:  { padding: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.Primary, marginBottom: 2 },
  subtitle: { fontSize: 13, color: Colors.TextMuted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.TextMuted, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.TextMuted, textAlign: 'center', paddingHorizontal: 20 },
  list: { gap: 12 },
  card: {
    backgroundColor: Colors.Surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.Primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.TextLight, fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '700', color: Colors.Text, marginBottom: 2 },
  instituicao: { fontSize: 13, color: Colors.TextMuted, marginBottom: 2 },
  avaliacao: { fontSize: 12, color: Colors.TextMuted },
  seta: { fontSize: 22, color: Colors.Primary, fontWeight: '300' },
});
