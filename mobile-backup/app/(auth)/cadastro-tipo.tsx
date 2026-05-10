import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

export default function CadastroTipoScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo ao UniRide</Text>
          <Text style={styles.subtitle}>Como você vai usar o app?</Text>
        </View>

        <View style={styles.cardsContainer}>
          <View style={styles.optionCard}>
            <Ionicons name="school-outline" size={48} color={Colors.Primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>Sou Passageiro</Text>
            <Text style={styles.optionDesc}>
              Encontre caronas de outros universitários e economize no transporte.
            </Text>
            <Button
              title="Sou Passageiro"
              onPress={() => router.push('/(auth)/cadastro-passageiro')}
              variant="primary"
              style={styles.optionButton}
            />
          </View>

          <View style={styles.optionCard}>
            <Ionicons name="car-outline" size={48} color={Colors.Primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>Sou Motorista</Text>
            <Text style={styles.optionDesc}>
              Ofereça caronas, divida despesas e ajude outros estudantes.
            </Text>
            <Button
              title="Sou Motorista"
              onPress={() => router.push('/(auth)/cadastro-motorista')}
              variant="secondary"
              style={styles.optionButton}
            />
          </View>
        </View>

        <Button
          title="Já tenho conta"
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.TextLight,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: Colors.Surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.Primary,
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    color: Colors.TextMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionButton: {
    width: '100%',
  },
  backButton: {
    marginTop: 24,
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
