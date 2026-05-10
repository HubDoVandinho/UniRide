import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppAlert } from '@/hooks/useAppAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { amizadeService } from '@/services/amizade.service';
import { useAuthStore } from '@/stores/auth.store';
import { AmizadeResponse } from '@/types/api.types';

function AmigoCard({
  item,
  meuId,
  onVerPerfil,
  onRemover,
}: {
  item: AmizadeResponse;
  meuId: number;
  onVerPerfil: () => void;
  onRemover: () => void;
}) {
  const outro = item.solicitante.id === meuId ? item.destinatario : item.solicitante;
  const inicial = outro.nome.charAt(0).toUpperCase();
  const isMotorista = outro.tipo === 'MOTORISTA';

  return (
    <TouchableOpacity style={styles.card} onPress={onVerPerfil} activeOpacity={0.75}>
      <View style={styles.avatar}>
        {outro.fotoPerfil
          ? <Image source={{ uri: outro.fotoPerfil }} style={styles.avatarImage} />
          : <Text style={styles.avatarText}>{inicial}</Text>
        }
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardNome} numberOfLines={1}>{outro.nome}</Text>
        <View style={styles.cardSubRow}>
          <Ionicons
            name={isMotorista ? 'car-outline' : 'school-outline'}
            size={12}
            color={Colors.TextMuted}
          />
          <Text style={styles.cardSub}>{isMotorista ? 'Motorista' : 'Passageiro'}</Text>
          {outro.avaliacaoMedia != null && (
            <>
              <Text style={styles.cardSubDot}>•</Text>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.cardSub}>{outro.avaliacaoMedia.toFixed(1)}</Text>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemover}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="person-remove-outline" size={18} color={Colors.Error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AmigosScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showAlert, alertModal } = useAppAlert();
  const [amigos, setAmigos] = useState<AmizadeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setAmigos(await amizadeService.listarAmigos());
    } catch {
      showAlert('Erro', 'Não foi possível carregar seus amigos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const handleRemover = (amizadeId: number, nome: string) => {
    showAlert('Remover amigo', `Deseja remover ${nome} da sua lista?`, [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await amizadeService.remover(amizadeId);
            setAmigos((prev) => prev.filter((a) => a.id !== amizadeId));
          } catch {
            showAlert('Erro', 'Não foi possível remover o amigo.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AmizadeResponse }) => {
    const outro = item.solicitante.id === user!.id ? item.destinatario : item.solicitante;
    return (
      <AmigoCard
        item={item}
        meuId={user!.id}
        onVerPerfil={() =>
          router.push({ pathname: '/perfil/[id]', params: { id: outro.id } })
        }
        onRemover={() => handleRemover(item.id, outro.nome)}
      />
    );
  };

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
            Amigos{amigos.length > 0 ? ` (${amigos.length})` : ''}
          </Text>
          <Text style={styles.subtitle}>Seus colegas de carona</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.Primary} />
          </View>
        ) : amigos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={Colors.Primary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nenhum amigo ainda</Text>
            <Text style={styles.emptySubtitle}>
              Busque colegas na aba Comunidade e adicione-os como amigos.
            </Text>
            <TouchableOpacity
              style={styles.comunidadeBtn}
              onPress={() => router.push('/comunidade')}
            >
              <Text style={styles.comunidadeBtnText}>Ir para Comunidade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={amigos}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
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
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.Primary },
  subtitle: { fontSize: 13, color: Colors.TextMuted, marginTop: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.Primary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: Colors.TextMuted,
    textAlign: 'center', paddingHorizontal: 28, marginBottom: 20,
  },
  comunidadeBtn: {
    backgroundColor: Colors.Primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  comunidadeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { gap: 10, paddingBottom: 24 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: 15, fontWeight: '600', color: Colors.Text, marginBottom: 3 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub: { fontSize: 12, color: Colors.TextMuted },
  cardSubDot: { fontSize: 12, color: Colors.TextMuted },
  removeBtn: { padding: 4 },
});
