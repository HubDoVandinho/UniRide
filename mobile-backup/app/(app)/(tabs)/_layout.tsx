import React, { useEffect, useRef } from 'react';
import { AppState, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useNotificationStore } from '@/stores/notification.store';
import { useAuthStore } from '@/stores/auth.store';

const POLL_INTERVAL_MS = 5_000;

function TabIcon({
  name,
  focused,
  badge,
  size = 24,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  badge?: boolean;
  size?: number;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as React.ComponentProps<typeof Ionicons>['name'])}
        size={size}
        color={focused ? Colors.Primary : '#999'}
      />
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -6,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#FF6B00',
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      )}
    </View>
  );
}

const TAB_BAR_BASE = {
  backgroundColor: Colors.Surface,
  borderTopColor: 'rgba(123,47,190,0.15)',
  borderTopWidth: 1,
} as const;

export default function TabsLayout() {
  const segments = useSegments();
  const { token } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Altura base responsiva
  const isLargeScreen  = screenHeight >= 800;
  const baseHeight     = isLargeScreen ? 66 : 60;
  const basePadBottom  = isLargeScreen ? 10 : 8;
  const basePadTop     = isLargeScreen ? 6 : 4;
  const iconSize       = isLargeScreen ? 26 : 24;
  const labelSize      = isLargeScreen ? 12 : 11;

  // insets.bottom = home indicator (iOS) ou barra de gestos (Android)
  // Distribui 30% do inset como paddingTop extra para centralizar ícones na zona visível
  const extraTopPad   = Math.round(insets.bottom * 0.3);
  const tabBarHeight  = baseHeight + insets.bottom;
  const paddingTop    = basePadTop + extraTopPad;
  const paddingBottom = basePadBottom + insets.bottom;
  const { atualizar, amizadesPendentes, solicitacoesPendentes, aprovacoesNaoVistas, caronasComEmbarcados, caronasComMensagemNova, negativosNaoVistos } = useNotificationStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalNotif = amizadesPendentes + aprovacoesNaoVistas + caronasComEmbarcados.length + caronasComMensagemNova.length + negativosNaoVistos;

  // Oculta a tab bar em sub-telas de perfil
  const perfilIdx = segments.indexOf('perfil' as never);
  const isPerfilSubscreen =
    perfilIdx !== -1 &&
    segments.length > perfilIdx + 1 &&
    segments[perfilIdx + 1] !== '(index)';

  const tabBarStyle = isPerfilSubscreen
    ? { display: 'none' as const }
    : { ...TAB_BAR_BASE, height: tabBarHeight, paddingTop, paddingBottom };

  // Polling de notificações
  useEffect(() => {
    if (!token) return;

    atualizar();
    pollingRef.current = setInterval(atualizar, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        atualizar();
        pollingRef.current = setInterval(atualizar, POLL_INTERVAL_MS);
      } else {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    });

    return () => {
      sub.remove();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.Primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="solicitar"
        options={{
          title: 'Solicitar',
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="oferecer"
        options={{
          title: 'Oferecer',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="car" focused={focused} badge={solicitacoesPendentes > 0} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Meu Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} badge={totalNotif > 0} size={iconSize} />
          ),
        }}
      />
    </Tabs>
  );
}
