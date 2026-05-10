import api from './api';
import {
  ApiResponse,
  AuthResponse,
  CadastroMotoristaRequest,
  CadastroPassageiroRequest,
  ParticipanteResponse,
} from '@/types/api.types';

export const authService = {
  async login(login: string, senha: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/api/v1/auth/login',
      { login, senha }
    );
    return response.data.dados;
  },

  async cadastrarPassageiro(
    data: CadastroPassageiroRequest
  ): Promise<ParticipanteResponse> {
    const response = await api.post<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/passageiros',
      data
    );
    return response.data.dados;
  },

  async cadastrarMotorista(
    data: CadastroMotoristaRequest
  ): Promise<ParticipanteResponse> {
    const response = await api.post<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/motoristas',
      data
    );
    return response.data.dados;
  },

  async confirmarEmail(token: string): Promise<void> {
    await api.get(`/api/v1/auth/confirmar?token=${token}`);
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>(
      '/api/v1/auth/refresh',
      { refreshToken }
    );
    return response.data.dados;
  },

  async logout(): Promise<void> {
    await api.post('/api/v1/auth/logout');
  },

  async reenviarVerificacao(email: string): Promise<void> {
    await api.post('/api/v1/auth/reenviar-verificacao', { email });
  },
};
