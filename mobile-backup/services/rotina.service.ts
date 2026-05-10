import api from './api';
import {
  ApiResponse,
  AtualizarRotinaRequest,
  CaronaResponse,
  CriarRotinaRequest,
  RotinaResponse,
} from '@/types/api.types';

export const rotinaService = {
  async criar(data: CriarRotinaRequest): Promise<RotinaResponse> {
    const response = await api.post<ApiResponse<RotinaResponse>>(
      '/api/v1/rotinas',
      data
    );
    return response.data.dados;
  },

  async listar(): Promise<RotinaResponse[]> {
    const response = await api.get<ApiResponse<RotinaResponse[]>>(
      '/api/v1/rotinas/minhas'
    );
    return response.data.dados;
  },

  async gerarCarona(rotinaId: number, data: string): Promise<CaronaResponse> {
    const response = await api.post<ApiResponse<CaronaResponse>>(
      `/api/v1/rotinas/${rotinaId}/caronas`,
      null,
      { params: { data } }
    );
    return response.data.dados;
  },

  async atualizar(id: number, data: AtualizarRotinaRequest): Promise<RotinaResponse> {
    const response = await api.put<ApiResponse<RotinaResponse>>(
      `/api/v1/rotinas/${id}`,
      data
    );
    return response.data.dados;
  },

  async excluir(id: number, cancelarCaronas: boolean): Promise<void> {
    await api.delete(`/api/v1/rotinas/${id}`, { params: { cancelarCaronas } });
  },
};
