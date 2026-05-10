import api from './api';
import { ApiResponse, InstituicaoInfo } from '@/types/api.types';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

export const instituicaoService = {
  async buscar(termo: string): Promise<InstituicaoInfo[]> {
    const response = await api.get<ApiResponse<PageResponse<InstituicaoInfo>>>(
      `/api/v1/instituicoes/buscar?termo=${encodeURIComponent(termo)}`
    );
    return response.data.dados.content;
  },

  async listar(): Promise<InstituicaoInfo[]> {
    const response = await api.get<ApiResponse<PageResponse<InstituicaoInfo>>>(
      '/api/v1/instituicoes'
    );
    return response.data.dados.content;
  },
};
