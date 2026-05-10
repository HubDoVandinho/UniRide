import api from './api';
import { AmizadeResponse, ApiResponse, PerfilPublicoResponse } from '@/types/api.types';

export const amizadeService = {

  async listarAmigos(): Promise<AmizadeResponse[]> {
    const response = await api.get<ApiResponse<AmizadeResponse[]>>('/api/v1/amizades');
    return response.data.dados;
  },

  async listarPendentes(): Promise<AmizadeResponse[]> {
    const response = await api.get<ApiResponse<AmizadeResponse[]>>('/api/v1/amizades/pendentes');
    return response.data.dados;
  },

  async listarEnviadas(): Promise<AmizadeResponse[]> {
    const response = await api.get<ApiResponse<AmizadeResponse[]>>('/api/v1/amizades/enviadas');
    return response.data.dados;
  },

  async enviar(destinatarioId: number): Promise<AmizadeResponse> {
    const response = await api.post<ApiResponse<AmizadeResponse>>(
      `/api/v1/amizades/${destinatarioId}`
    );
    return response.data.dados;
  },

  async aceitar(amizadeId: number): Promise<AmizadeResponse> {
    const response = await api.put<ApiResponse<AmizadeResponse>>(
      `/api/v1/amizades/${amizadeId}/aceitar`
    );
    return response.data.dados;
  },

  async recusar(amizadeId: number): Promise<AmizadeResponse> {
    const response = await api.put<ApiResponse<AmizadeResponse>>(
      `/api/v1/amizades/${amizadeId}/recusar`
    );
    return response.data.dados;
  },

  async remover(amizadeId: number): Promise<void> {
    await api.delete(`/api/v1/amizades/${amizadeId}`);
  },

  async cancelar(amizadeId: number): Promise<void> {
    await api.delete(`/api/v1/amizades/${amizadeId}/cancelar`);
  },

  async buscar(termo: string): Promise<PerfilPublicoResponse[]> {
    const response = await api.get<ApiResponse<PerfilPublicoResponse[]>>(
      '/api/v1/participantes/buscar',
      { params: { termo } }
    );
    return response.data.dados;
  },

  async perfilPublico(id: number): Promise<PerfilPublicoResponse> {
    const response = await api.get<ApiResponse<PerfilPublicoResponse>>(
      `/api/v1/participantes/${id}/perfil`
    );
    return response.data.dados;
  },

  async perfilPublicoPorUsername(username: string): Promise<PerfilPublicoResponse> {
    const response = await api.get<ApiResponse<PerfilPublicoResponse>>(
      `/api/v1/participantes/by-username/${encodeURIComponent(username)}/perfil`
    );
    return response.data.dados;
  },

  async listarAmigosDeUsuario(userId: number): Promise<PerfilPublicoResponse[]> {
    const response = await api.get<ApiResponse<PerfilPublicoResponse[]>>(
      `/api/v1/participantes/${userId}/amigos`
    );
    return response.data.dados;
  },
};
