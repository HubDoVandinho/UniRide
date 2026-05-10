import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.Background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="cadastro-tipo" />
      <Stack.Screen name="cadastro-passageiro" />
      <Stack.Screen name="cadastro-motorista" />
      <Stack.Screen name="verificar-email" options={{ gestureEnabled: false }} />
      <Stack.Screen name="conta-ativada" options={{ gestureEnabled: false }} />
      <Stack.Screen name="esqueci-senha" />
    </Stack>
  );
}
