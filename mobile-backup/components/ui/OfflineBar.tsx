import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStore } from '@/stores/network.store';

export function OfflineBar() {
  const isOffline = useNetworkStore((s) => s.isOffline);
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View style={[styles.bar, { transform: [{ translateY }] }]}>
      <Ionicons name="wifi-outline" size={22} color="#fff" style={{ opacity: 0.85 }} />
      <View style={styles.textos}>
        <Text style={styles.titulo}>Sem conexão</Text>
        <Text style={styles.subtitulo}>Verifique sua internet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 1,
  },
});
