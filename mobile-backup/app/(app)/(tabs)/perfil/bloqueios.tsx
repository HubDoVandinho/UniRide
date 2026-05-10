import React, { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { denunciaService } from '@/services/denuncia.service';
import { useAppAlert } from '@/hooks/useAppAlert';
import { BloqueioResponse } from '@/types/api.types';

export default function BloqueiosScreen() {
  const router = useRouter();
  const { showAlert, alertModal } = useAppAlert();
  const [bloqueios, setBloqueios] = useState<BloqueioResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [desbloqueando, setDesbloqueando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await denunciaService.listarBloqueios();
      setBloqueios(lista);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleDesbloquear = (b: BloqueioResponse) => {
    showAlert(
      'Desbloquear usuário',
      `Deseja desbloquear ${b.nomeBloqueado ?? 'este usuário'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: async () => {
            setDesbloqueando(b.bloqueadoId);
            try {
              await denunciaService.desbloquear(b.bloqueadoId);
              setBloqueios(prev => prev.filter(x => x.id !== b.id));
            } catch (e: unknown) {
              showAlert('Erro', e instanceof Error ? e.message : 'Não foi possível desbloquear.');
            } finally {
              setDesbloqueando(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BloqueioResponse }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        {item.fotoBloqueado
          ? <Image source={{ uri: item.fotoBloqueado }} style={styles.avatarImg} />
          : <Text style={styles.avatarText}>
              {(item.nomeBloqueado ?? 'U').charAt(0).toUpperCase()}
            </Text>
        }
      </View>
      <View style={styles.info}>
        <Text style={styles.nome}>{item.nomeBloqueado ?? `#${item.bloqueadoId}`}</Text>
        <Text style={styles.data}>
          Bloqueado em {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.desbloquearBtn, desbloqueando === item.bloqueadoId && { opacity: 0.5 }]}
        onPress={() => handleDesbloquear(item)}
        disabled={desbloqueando === item.bloqueadoId}
        activeOpacity={0.8}
      >
        {desbloqueando === item.bloqueadoId
          ? <ActivityIndicator size="small" color={Colors.Error} />
          : <Text style={styles.desbloquearText}>Desbloquear</Text>
        }
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Usuários bloqueados</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.Primary} size="large" />
      ) : (
        <FlatList
          data={bloqueios}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={bloqueios.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); carregar(); }}
              colors={[Colors.Primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={52} color={Colors.Primary} />
              <Text style={styles.emptyTitle}>Nenhum bloqueio</Text>
              <Text style={styles.emptyText}>Você não bloqueou nenhum usuário.</Text>
            </View>
          }
        />
      )}

      {alertModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.SurfaceLight },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: Colors.Surface, borderBottomWidth: 1, borderBottomColor: Colors.SurfaceLight },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.Primary },

  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.Surface, borderRadius: 14,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.Primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  info: { flex: 1, gap: 2 },
  nome: { fontSize: 15, fontWeight: '600', color: Colors.Text },
  data: { fontSize: 12, color: Colors.TextMuted },

  desbloquearBtn: {
    borderWidth: 1.5, borderColor: Colors.Error,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    minWidth: 44, alignItems: 'center',
  },
  desbloquearText: { fontSize: 13, fontWeight: '600', color: Colors.Error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 80, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.Text },
  emptyText: { fontSize: 14, color: Colors.TextMuted, textAlign: 'center' },
});
