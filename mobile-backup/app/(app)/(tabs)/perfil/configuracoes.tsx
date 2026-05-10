import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

type Item = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  route: string;
};

const ITEMS: Item[] = [
  { icon: 'pencil-outline',   label: 'Editar dados',           route: '/perfil/editar' },
  { icon: 'settings-outline', label: 'Preferências de viagem', route: '/perfil/preferencias' },
  { icon: 'location-outline', label: 'Meus endereços',         route: '/perfil/enderecos' },
  { icon: 'ban-outline',      label: 'Usuários bloqueados',    route: '/perfil/bloqueios' },
];

export default function ConfiguracoesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.Primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <View style={styles.section}>
        {ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.actionItem, idx === ITEMS.length - 1 && styles.actionItemLast]}
            onPress={() => router.push(item.route as never)}
          >
            <Ionicons name={item.icon} size={20} color={Colors.Primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.TextMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.SurfaceLight },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: 26, fontWeight: '800', color: Colors.Primary },

  section: {
    marginHorizontal: 20, backgroundColor: Colors.Surface, borderRadius: 16,
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
});
