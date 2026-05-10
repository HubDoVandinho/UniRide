import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function AppIndex() {
  const { token } = useAuthStore();

  if (!token) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/solicitar" />;
}
