import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse } from '@/types/api.types';
import { useNetworkStore } from '@/stores/network.store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// We use a getter function to avoid circular dependency with auth.store
let getTokenFn: (() => string | null) | null = null;
let logoutFn: (() => void) | null = null;
let refreshTokenFn: ((token: string) => Promise<string>) | null = null;

export function setAuthInterceptorFns(
  getToken: () => string | null,
  logout: () => void,
  refreshToken: (token: string) => Promise<string>
) {
  getTokenFn = getToken;
  logoutFn = logout;
  refreshTokenFn = refreshToken;
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getTokenFn ? getTokenFn() : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    useNetworkStore.getState().setOffline(false);
    return response;
  },
  (error) => {
    // handled below in the existing interceptor — this just resets offline on success
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
        if (storedRefreshToken && refreshTokenFn) {
          const newToken = await refreshTokenFn(storedRefreshToken);
          processQueue(null, newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        } else {
          processQueue(new Error('No refresh token'), null);
          if (logoutFn) logoutFn();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (logoutFn) logoutFn();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Conta suspensa — logout imediato + tela de bloqueio
    if (error.response?.status === 403) {
      const data = error.response.data as any;
      if (data?.codigo === 'CONTA_SUSPENSA') {
        if (logoutFn) logoutFn();
        const { router } = require('expo-router');
        router.replace('/(auth)/conta-suspensa');
        return Promise.reject(new Error(data.mensagem));
      }
    }

    // Extrai a mensagem do backend quando disponível, tornando-a acessível via error.message
    const backendMensagem = (error.response?.data as ApiResponse<unknown>)?.mensagem;
    if (backendMensagem) {
      return Promise.reject(new Error(backendMensagem));
    }

    // Fallback legível para 401 sem corpo estruturado (ex.: gateway retorna HTML de erro)
    if (error.response?.status === 401) {
      return Promise.reject(new Error('E-mail ou senha inválidos.'));
    }

    // Fallback para erros de rede sem resposta do servidor
    if (!error.response) {
      useNetworkStore.getState().setOffline(true);
      const url = `${error.config?.baseURL ?? '?'}${error.config?.url ?? ''}`;
      return Promise.reject(
        new Error(`Sem conexão [${error.code ?? 'ERR'}] ${error.message} → ${url}`)
      );
    }

    return Promise.reject(error);
  }
);

export default api;
