import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Solicita permissão de notificações e registra o Expo Push Token no backend.
 * Deve ser chamado logo após o login bem-sucedido.
 * Não faz nada no Expo Go (SDK 53+ removeu push remoto do Expo Go).
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (Constants.appOwnership === 'expo') return; // Expo Go — push remoto indisponível

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await api.put('/api/v1/participantes/me/push-token', { pushToken });
  } catch (e) {
    // Falha silenciosa — notificações não são críticas
    console.warn('[push] Falha ao registrar push token:', e);
  }
}
