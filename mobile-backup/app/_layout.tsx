import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { OfflineBar } from '@/components/ui/OfflineBar';
import { registerPushToken } from '@/services/push.service';

// Configuração global: notificações aparecem mesmo com o app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { token, user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // Registra push token quando o usuário faz login
  useEffect(() => {
    if (token) {
      registerPushToken();
    }
  }, [token]);

  // Handler de toque na notificação → navega conforme o tipo
  useEffect(() => {
    notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      // notificação recebida em foreground — o setNotificationHandler já exibe o alerta
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const dados = response.notification.request.content.data as Record<string, unknown>;
      const tipo = dados?.tipo as string | undefined;

      if (!tipo) return;

      if (tipo === 'AMIZADE_PENDENTE' || tipo === 'AMIZADE_ACEITA') {
        router.push('/amigos');
      } else if (
        tipo === 'SOLICITACAO_PENDENTE' ||
        tipo === 'SOLICITACAO_APROVADA' ||
        tipo === 'SOLICITACAO_RECUSADA'
      ) {
        const caronaId = dados?.caronaId;
        if (caronaId) router.push(`/carona/${caronaId}` as any);
      } else if (
        tipo === 'CARONA_INICIADA' ||
        tipo === 'CARONA_CONCLUIDA' ||
        tipo === 'CARONA_CANCELADA'
      ) {
        const caronaId = dados?.caronaId;
        if (caronaId) router.push(`/carona/${caronaId}` as any);
      } else if (tipo === 'MOTORISTA_APROVADO' || tipo === 'MOTORISTA_REJEITADO') {
        router.push('/(app)/(tabs)/perfil' as any);
      } else if (tipo === 'COMPROVANTE_RECEBIDO' || tipo === 'PAGAMENTO_CONFIRMADO') {
        const caronaId = dados?.caronaId;
        if (caronaId) router.push(`/chat/${caronaId}` as any);
      }
    });

    return () => {
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup  = segments[0] === '(auth)';
    const inAppGroup   = segments[0] === '(app)';
    const inAdminGroup = segments[0] === '(admin)';
    const isAdmin      = user?.tipo === 'ADMIN';

    if (!token && (inAppGroup || inAdminGroup)) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup && segments[1] !== 'conta-ativada') {
      router.replace(isAdmin ? '/(admin)/motoristas' : '/(app)/solicitar');
    } else if (token && isAdmin && inAppGroup) {
      router.replace('/(admin)/motoristas');
    } else if (token && !isAdmin && inAdminGroup) {
      router.replace('/(app)/solicitar');
    }
  }, [token, user, isLoading, segments]);

  // A key baseada no ID do usuário força o remount completo de toda a pilha
  // quando a conta muda — estado, timers e requisições pendentes são descartados.
  const appKey = user?.id?.toString() ?? 'sem-usuario';

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <OfflineBar />
      <Stack key={appKey} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </SafeAreaProvider>
  );
}
