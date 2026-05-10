import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

export default function ContaAtivadaScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.Success} />
        </View>

        <Text style={styles.titulo}>Conta ativada!</Text>
        <Text style={styles.subtitulo}>
          Seu e-mail foi confirmado com sucesso. Bem-vindo ao UniRide!
        </Text>

        <Button
          title="Fazer login"
          onPress={() => router.replace('/(auth)/login')}
          variant="primary"
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.Background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 24,
    shadowColor: Colors.Success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.TextLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btn: { width: '100%' },
});
