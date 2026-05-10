import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { amizadeService } from '@/services/amizade.service';
import { PerfilPublicoResponse } from '@/types/api.types';

function AmigoCard({
  item,
  onPress,
}: {
  item: PerfilPublicoResponse;
  onPress: () => void;
}) {
  const inicial = item.nome.charAt(0).toUpperCase();
  const isMotorista = item.tipo === 'MOTORISTA';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        {item.fotoPerfil
          ? <Image source={{ uri: item.fotoPerfil }} style={styles.avatarImage} />
          : <Text style={styles.avatarText}>{inicial}</Text>
        }
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardNome} numberOfLines={1}>{item.nome}</Text>
        <View style={styles.cardSubRow}>
          <Ionicons
            name={isMotorista ? 'car-outline' : 'school-outline'}
            size={12}
            color={Colors.TextMuted}
          />
          <Text style={styles.cardSub}>{isMotorista ? 'Motorista' : 'Passageiro'}</Text>
          {item.avaliacaoMedia != null && (
            <>
              <Text style={styles.cardSubDot}>•</Text>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.cardSub}>{item.avaliacaoMedia.toFixed(1)}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
    </TouchableOpacity>
  );
}

export default function AmigosDoPerfil() {
  const router = useRouter();
  const { userId, nome } = useLocalSearchParams<{ userId: string; nome?: string }>();

  const [amigos, setAmigos] = useState<PerfilPublicoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acessoNegado, setAcessoNegado] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setAcessoNegado(false);
    setErro(false);
    try {
      const lista = await amizadeService.listarAmigosDeUsuario(Number(userId));
      setAmigos(lista);
    } catch (e: any) {
      if (e.message === 'Você não tem permissão para realizar esta ação.') {
        setAcessoNegado(true);
      } else {
        setErro(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { carregar(); }, [userId]);

  const nomeExibicao = nome ?? 'usuário';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>
            Amigos{!loading && !acessoNegado && !erro ? ` (${amigos.length})` : ''}
          </Text>
          <Text style={styles.subtitle}>Lista de amigos de {nomeExibicao}</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.Primary} />
          </View>
        ) : acessoNegado ? (
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16, opacity: 0.6 }} />
            <Text style={styles.emptyTitle}>Lista privada</Text>
            <Text style={styles.emptySubtitle}>
              Apenas amigos de {nomeExibicao} podem ver esta lista.
            </Text>
          </View>
        ) : erro ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={56} color={Colors.Error} style={{ marginBottom: 16, opacity: 0.7 }} />
            <Text style={styles.emptyTitle}>Erro ao carregar</Text>
            <Text style={styles.emptySubtitle}>Não foi possível carregar a lista de amigos.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => carregar()}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : amigos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhum amigo ainda</Text>
            <Text style={styles.emptySubtitle}>{nomeExibicao} ainda não tem amigos no UniRide.</Text>
          </View>
        ) : (
          <FlatList
            data={amigos}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <AmigoCard
                item={item}
                onPress={() => router.push({ pathname: '/perfil/[id]', params: { id: item.id } })}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => carregar(true)}
                colors={[Colors.Primary]}
                tintColor={Colors.Primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.SurfaceLight },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header:    { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn:  { padding: 4 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitle: { fontSize: 13, color: Colors.TextMuted, marginTop: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.Primary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: Colors.TextMuted,
    textAlign: 'center', paddingHorizontal: 28, marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: Colors.Primary, borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.Surface, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 20 },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  cardInfo:    { flex: 1 },
  cardNome:    { fontSize: 15, fontWeight: '600', color: Colors.Text, marginBottom: 3 },
  cardSubRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub:     { fontSize: 12, color: Colors.TextMuted },
  cardSubDot:  { fontSize: 12, color: Colors.TextMuted },
});
