import { Stack } from 'expo-router';
import { AppModal } from '@/components/ui/AppModal';
import { useModalStore } from '@/stores/modal.store';

function GlobalModal() {
  const { visible, options, hide } = useModalStore();
  if (!options) return null;
  return (
    <AppModal
      visible={visible}
      title={options.title}
      message={options.message}
      icon={options.icon}
      iconColor={options.iconColor}
      buttons={options.buttons}
      onRequestClose={hide}
    />
  );
}

export default function AppLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="solicitacoes" />
        <Stack.Screen name="amigos" />
        <Stack.Screen name="amigos-motoristas" />
        <Stack.Screen name="agenda-motorista" />
        <Stack.Screen name="minhas-solicitacoes" />
        <Stack.Screen name="caronas" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="comunidade" />
        <Stack.Screen name="perfil" />
      </Stack>
      <GlobalModal />
    </>
  );
}
