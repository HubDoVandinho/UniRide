import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ParticipanteResponse } from '@/types/api.types';
import { setAuthInterceptorFns } from '@/services/api';

interface AuthState {
  user: ParticipanteResponse | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ParticipanteResponse) => void;
  loadFromStorage: () => Promise<void>;
  getToken: () => string | null;
  refreshSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  getToken: () => get().token,

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const userJson = await SecureStore.getItemAsync('user');
      if (token && userJson) {
        const user: ParticipanteResponse = JSON.parse(userJson);
        set({ token, user, isLoading: false });
      } else if (token) {
        // Token existe mas user JSON não — busca o perfil da API
        set({ token, user: null, isLoading: false });
      } else {
        set({ token: null, user: null, isLoading: false });
      }
    } catch {
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (login: string, senha: string) => {
    // Lazy import to avoid circular dependency
    const { authService } = await import('@/services/auth.service');
    set({ isLoading: true });
    try {
      const authData = await authService.login(login, senha);
      await Promise.all([
        SecureStore.setItemAsync('accessToken', authData.accessToken),
        SecureStore.setItemAsync('refreshToken', authData.refreshToken),
        SecureStore.setItemAsync('user', JSON.stringify(authData.participante)),
      ]);
      set({ token: authData.accessToken, user: authData.participante, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const { authService } = await import('@/services/auth.service');
      await authService.logout();
    } catch {
      // ignora falha no logout do servidor — limpa estado local de qualquer forma
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    set({ token: null, user: null, isLoading: false });
  },

  setUser: (user: ParticipanteResponse) => {
    set({ user });
    SecureStore.setItemAsync('user', JSON.stringify(user));
  },

  refreshSession: async () => {
    const { authService } = await import('@/services/auth.service');
    const storedRefresh = await SecureStore.getItemAsync('refreshToken');
    if (!storedRefresh) throw new Error('Sessão expirada. Faça login novamente.');
    const data = await authService.refresh(storedRefresh);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(data.participante));
    set({ token: data.accessToken, user: data.participante });
  },
}));

// Wire up the interceptor functions after store creation
const store = useAuthStore.getState();
setAuthInterceptorFns(
  () => useAuthStore.getState().token,
  () => useAuthStore.getState().logout(),
  async (refreshToken: string) => {
    const { authService } = await import('@/services/auth.service');
    const data = await authService.refresh(refreshToken);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    useAuthStore.setState({ token: data.accessToken });
    return data.accessToken;
  }
);
