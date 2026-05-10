import api from './api';
import {
  ApiResponse,
  DenunciaResponse,
  PageResponse,
  ParticipanteResponse,
  StatusDenuncia,
} from '@/types/api.types';

export const MOTIVOS_DENUNCIA_LABEL: Record<string, string> = {
  NAO_APARECEU: 'Não apareceu',
  COMPORTAMENTO_INADEQUADO: 'Comportamento inadequado',
  PERFIL_FALSO: 'Perfil falso',
  VEICULO_DIFERENTE: 'Veículo diferente do cadastrado',
  COBRANCA_FORA_APP: 'Cobrança fora do app',
  ASSEDIO: 'Assédio',
  OUTRO: 'Outro',
};

export const adminService = {
  async listarMotoristasNaoAprovados(page = 0): Promise<PageResponse<ParticipanteResponse>> {
    const res = await api.get<ApiResponse<PageResponse<ParticipanteResponse>>>(
      `/api/v1/participantes/admin/motoristas/pendentes?page=${page}&size=20`
    );
    return res.data.dados;
  },

  async aprovarMotorista(id: number): Promise<void> {
    await api.patch(`/api/v1/participantes/${id}/aprovar-motorista`);
  },

  async rejeitarMotorista(id: number, motivo?: string): Promise<void> {
    const params = motivo ? `?motivo=${encodeURIComponent(motivo)}` : '';
    await api.patch(`/api/v1/participantes/${id}/rejeitar-motorista${params}`);
  },

  async listarDenuncias(
    status: StatusDenuncia = 'PENDENTE',
    page = 0
  ): Promise<PageResponse<DenunciaResponse>> {
    const res = await api.get<ApiResponse<PageResponse<DenunciaResponse>>>(
      `/api/v1/admin/denuncias?status=${status}&page=${page}&size=20`
    );
    return res.data.dados;
  },

  async revisarDenuncia(
    id: number,
    status: StatusDenuncia,
    notaAdmin?: string
  ): Promise<void> {
    await api.patch(`/api/v1/admin/denuncias/${id}`, { status, notaAdmin });
  },

  async suspenderParticipante(id: number): Promise<void> {
    await api.patch(`/api/v1/participantes/${id}/suspender`);
  },

  async dessuspenderParticipante(id: number): Promise<void> {
    await api.patch(`/api/v1/participantes/${id}/dessuspender`);
  },

  async buscarParticipante(id: number): Promise<ParticipanteResponse> {
    const res = await api.get<ApiResponse<ParticipanteResponse>>(`/api/v1/participantes/${id}`);
    return res.data.dados;
  },
};
