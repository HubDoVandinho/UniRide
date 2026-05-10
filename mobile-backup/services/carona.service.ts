import api from './api';
import {
  ApiResponse,
  AvaliarRequest,
  AvaliacaoResponse,
  CaronaResponse,
  MensagemRequest,
  MensagemResponse,
  RotaResponse,
  SolicitacaoResponse,
  SolicitarVagaRequest,
} from '@/types/api.types';

export const caronaService = {
  async listarDeMotorista(motoristaId: number): Promise<CaronaResponse[]> {
    const response = await api.get<ApiResponse<CaronaResponse[]>>(
      `/api/v1/caronas/motorista/${motoristaId}`
    );
    return response.data.dados;
  },

  async listarMinhasProximas(): Promise<CaronaResponse[]> {
    const response = await api.get<ApiResponse<CaronaResponse[]>>(
      '/api/v1/caronas/minhas/proximas'
    );
    return response.data.dados;
  },

  async listarMinhasHistorico(): Promise<CaronaResponse[]> {
    const response = await api.get<ApiResponse<CaronaResponse[]>>(
      '/api/v1/caronas/minhas/historico'
    );
    return response.data.dados;
  },

  async buscarPorDestino(
    lat: number | null,
    lng: number | null,
    direcao?: 'IDA' | 'VOLTA' | null,
    preferencias?: number[]
  ): Promise<CaronaResponse[]> {
    const params: Record<string, unknown> = {};
    if (lat != null) params.lat = lat;
    if (lng != null) params.lng = lng;
    if (direcao != null) params.direcao = direcao;
    if (preferencias && preferencias.length > 0) params.preferencias = preferencias.join(',');
    const response = await api.get<ApiResponse<{ content: CaronaResponse[] }>>(
      '/api/v1/caronas/buscar',
      { params }
    );
    return response.data.dados.content;
  },

  async buscarPorId(id: number): Promise<CaronaResponse> {
    const response = await api.get<ApiResponse<CaronaResponse>>(
      `/api/v1/caronas/${id}`
    );
    return response.data.dados;
  },

  async solicitarVaga(
    caronaId: number,
    req?: SolicitarVagaRequest
  ): Promise<SolicitacaoResponse> {
    const response = await api.post<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/caronas/${caronaId}/solicitacoes`,
      req ?? {}
    );
    return response.data.dados;
  },

  async listarMinhasSolicitacoes(): Promise<SolicitacaoResponse[]> {
    const response = await api.get<ApiResponse<SolicitacaoResponse[]>>(
      '/api/v1/solicitacoes/minhas'
    );
    return response.data.dados;
  },

  async listarSolicitacoesRecebidas(): Promise<SolicitacaoResponse[]> {
    const response = await api.get<ApiResponse<SolicitacaoResponse[]>>(
      '/api/v1/solicitacoes/recebidas'
    );
    return response.data.dados;
  },

  async aprovarSolicitacao(id: number): Promise<SolicitacaoResponse> {
    const response = await api.put<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/solicitacoes/${id}/aprovar`
    );
    return response.data.dados;
  },

  async recusarSolicitacao(id: number): Promise<SolicitacaoResponse> {
    const response = await api.put<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/solicitacoes/${id}/recusar`
    );
    return response.data.dados;
  },

  async confirmarEmbarqueComPin(id: number, pin: string): Promise<SolicitacaoResponse> {
    const response = await api.put<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/solicitacoes/${id}/embarcar`,
      { pin }
    );
    return response.data.dados;
  },

  async naoCompareceu(id: number): Promise<SolicitacaoResponse> {
    const response = await api.put<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/solicitacoes/${id}/nao-compareceu`
    );
    return response.data.dados;
  },

  async cancelarSolicitacao(solicitacaoId: number): Promise<void> {
    await api.delete(`/api/v1/solicitacoes/${solicitacaoId}`);
  },

  async iniciar(id: number): Promise<CaronaResponse> {
    const response = await api.put<ApiResponse<CaronaResponse>>(`/api/v1/caronas/${id}/iniciar`);
    return response.data.dados;
  },

  async concluir(id: number): Promise<CaronaResponse> {
    const response = await api.put<ApiResponse<CaronaResponse>>(`/api/v1/caronas/${id}/concluir`);
    return response.data.dados;
  },

  async cancelarCarona(id: number): Promise<void> {
    await api.delete(`/api/v1/caronas/${id}`);
  },

  async listarPorCarona(caronaId: number): Promise<SolicitacaoResponse[]> {
    const response = await api.get<ApiResponse<SolicitacaoResponse[]>>(
      `/api/v1/caronas/${caronaId}/solicitacoes`
    );
    return response.data.dados ?? [];
  },

  async gerarRota(id: number): Promise<RotaResponse> {
    const response = await api.get<ApiResponse<RotaResponse>>(`/api/v1/caronas/${id}/rota`);
    return response.data.dados;
  },

  async avaliar(data: AvaliarRequest): Promise<AvaliacaoResponse> {
    const response = await api.post<ApiResponse<AvaliacaoResponse>>(
      '/api/v1/avaliacoes',
      data
    );
    return response.data.dados;
  },

  async listarAvaliacoes(participanteId: number): Promise<AvaliacaoResponse[]> {
    const response = await api.get<ApiResponse<AvaliacaoResponse[]>>(
      `/api/v1/avaliacoes/participantes/${participanteId}`
    );
    return response.data.dados ?? [];
  },

  async listarMensagens(caronaId: number): Promise<MensagemResponse[]> {
    const response = await api.get<ApiResponse<MensagemResponse[]>>(
      `/api/v1/caronas/${caronaId}/mensagens`
    );
    return response.data.dados ?? [];
  },

  async enviarMensagem(caronaId: number, req: MensagemRequest): Promise<MensagemResponse> {
    const response = await api.post<ApiResponse<MensagemResponse>>(
      `/api/v1/caronas/${caronaId}/mensagens`,
      req
    );
    return response.data.dados;
  },

  async confirmarPagamento(solicitacaoId: number): Promise<SolicitacaoResponse> {
    const response = await api.patch<ApiResponse<SolicitacaoResponse>>(
      `/api/v1/solicitacoes/${solicitacaoId}/confirmar-pagamento`
    );
    return response.data.dados;
  },
};
