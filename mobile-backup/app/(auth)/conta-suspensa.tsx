import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

const SUPORTE_EMAIL = 'suporte@uniride.com';

export default function ContaSuspensaScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons name="ban" size={80} color={Colors.Error} />
        </View>

        <Text style={styles.titulo}>Conta suspensa</Text>
        <Text style={styles.subtitulo}>
          Sua conta foi suspensa devido a violações das nossas políticas de uso.
        </Text>
        <Text style={styles.subtitulo}>
          Se acredita que isso foi um engano, entre em contato com o suporte.
        </Text>

        <Button
          title="Contatar suporte"
          onPress={() => Linking.openURL(`mailto:${SUPORTE_EMAIL}`)}
          variant="primary"
          style={styles.btn}
        />

        <Text style={styles.email}>{SUPORTE_EMAIL}</Text>
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
    shadowColor: Colors.Error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.TextLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitulo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  btn: { width: '100%', marginTop: 20, marginBottom: 16 },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
