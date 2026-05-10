import api from './api';
import { ApiResponse, BloqueioResponse } from '@/types/api.types';

export type MotivoDenuncia =
  | 'NAO_APARECEU'
  | 'COMPORTAMENTO_INADEQUADO'
  | 'PERFIL_FALSO'
  | 'VEICULO_DIFERENTE'
  | 'COBRANCA_FORA_APP'
  | 'ASSEDIO'
  | 'OUTRO';

export const MOTIVOS_LABEL: Record<MotivoDenuncia, string> = {
  NAO_APARECEU: 'Não apareceu',
  COMPORTAMENTO_INADEQUADO: 'Comportamento inadequado',
  PERFIL_FALSO: 'Perfil falso',
  VEICULO_DIFERENTE: 'Veículo diferente do cadastrado',
  COBRANCA_FORA_APP: 'Cobrança fora do app',
  ASSEDIO: 'Assédio',
  OUTRO: 'Outro',
};

export interface CriarDenunciaPayload {
  denunciadoId: number;
  caronaId?: number;
  motivo: MotivoDenuncia;
  descricao?: string;
}

export const denunciaService = {
  async criar(payload: CriarDenunciaPayload): Promise<void> {
    await api.post<ApiResponse<unknown>>('/api/v1/denuncias', payload);
  },

  async bloquear(bloqueadoId: number): Promise<void> {
    await api.post<ApiResponse<unknown>>(`/api/v1/bloqueios/${bloqueadoId}`);
  },

  async desbloquear(bloqueadoId: number): Promise<void> {
    await api.delete<ApiResponse<unknown>>(`/api/v1/bloqueios/${bloqueadoId}`);
  },

  async listarBloqueios(): Promise<BloqueioResponse[]> {
    const res = await api.get<ApiResponse<BloqueioResponse[]>>('/api/v1/bloqueios');
    return res.data.dados;
  },
};
