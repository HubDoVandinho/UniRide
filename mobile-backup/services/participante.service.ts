import api from './api';
import {
  ApiResponse,
  AtualizarPerfilRequest,
  CadastroVeiculoRequest,
  EnderecoRequest,
  EnderecoResponse,
  ParticipanteResponse,
  PromoverMotoristaRequest,
  TipoPreferenciaResponse,
  VeiculoResponse,
} from '@/types/api.types';

export const participanteService = {
  async verificarUsername(username: string): Promise<boolean> {
    const response = await api.get<ApiResponse<{ disponivel: boolean }>>(
      `/api/v1/participantes/verificar-username?username=${encodeURIComponent(username)}`
    );
    return response.data.dados.disponivel;
  },

  async meuPerfil(): Promise<ParticipanteResponse> {
    const response = await api.get<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/me'
    );
    return response.data.dados;
  },

  async atualizarPerfil(data: AtualizarPerfilRequest): Promise<ParticipanteResponse> {
    const response = await api.put<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/me',
      data
    );
    return response.data.dados;
  },

  async listarTiposPreferencias(destinatario?: 'MOTORISTA' | 'PASSAGEIRO'): Promise<TipoPreferenciaResponse[]> {
    const params = destinatario ? `?destinatario=${destinatario}` : '';
    const response = await api.get<ApiResponse<TipoPreferenciaResponse[]>>(
      `/api/v1/preferencias${params}`
    );
    return response.data.dados;
  },

  async listarPreferencias(): Promise<TipoPreferenciaResponse[]> {
    const response = await api.get<ApiResponse<TipoPreferenciaResponse[]>>(
      '/api/v1/participantes/me/preferencias'
    );
    return response.data.dados;
  },

  async atualizarPreferencias(ids: number[]): Promise<void> {
    await api.put('/api/v1/participantes/me/preferencias', ids);
  },

  async criarPreferenciaCustom(nome: string): Promise<TipoPreferenciaResponse> {
    const response = await api.post<ApiResponse<TipoPreferenciaResponse>>(
      '/api/v1/participantes/me/preferencias/custom',
      nome,
      { headers: { 'Content-Type': 'text/plain' } }
    );
    return response.data.dados;
  },

  async deletarPreferenciaCustom(tipoId: number): Promise<void> {
    await api.delete(`/api/v1/participantes/me/preferencias/custom/${tipoId}`);
  },

  async motoristasPorPreferencias(ids: number[]): Promise<number[]> {
    const response = await api.get<number[]>(
      '/api/v1/participantes/motoristas/por-preferencias',
      { params: { ids: ids.join(',') } }
    );
    return response.data;
  },

  async listarEnderecos(): Promise<EnderecoResponse[]> {
    const response = await api.get<ApiResponse<EnderecoResponse[]>>(
      '/api/v1/participantes/me/enderecos'
    );
    return response.data.dados;
  },

  async adicionarEndereco(data: EnderecoRequest): Promise<EnderecoResponse> {
    const response = await api.post<ApiResponse<EnderecoResponse>>(
      '/api/v1/participantes/me/enderecos',
      data
    );
    return response.data.dados;
  },

  async removerEndereco(id: number): Promise<void> {
    await api.delete(`/api/v1/participantes/me/enderecos/${id}`);
  },

  async promoverMotorista(data: PromoverMotoristaRequest): Promise<ParticipanteResponse> {
    const response = await api.put<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/me/promover-motorista',
      data
    );
    return response.data.dados;
  },

  async buscarMeuVeiculo(): Promise<VeiculoResponse> {
    const response = await api.get<ApiResponse<VeiculoResponse>>(
      '/api/v1/participantes/me/veiculo'
    );
    return response.data.dados;
  },

  async listarVeiculos(): Promise<VeiculoResponse[]> {
    const response = await api.get<ApiResponse<VeiculoResponse[]>>(
      '/api/v1/participantes/me/veiculos'
    );
    return response.data.dados;
  },

  async cadastrarVeiculo(data: CadastroVeiculoRequest): Promise<ParticipanteResponse> {
    const response = await api.post<ApiResponse<ParticipanteResponse>>(
      '/api/v1/participantes/me/veiculos',
      data
    );
    return response.data.dados;
  },

  async atualizarVeiculo(veiculoId: number, data: CadastroVeiculoRequest): Promise<ParticipanteResponse> {
    const response = await api.put<ApiResponse<ParticipanteResponse>>(
      `/api/v1/participantes/me/veiculos/${veiculoId}`,
      data
    );
    return response.data.dados;
  },

  async removerVeiculo(veiculoId: number): Promise<void> {
    await api.delete(`/api/v1/participantes/me/veiculos/${veiculoId}`);
  },

  async apagarConta(senha: string): Promise<void> {
    await api.delete('/api/v1/participantes/me/conta', { data: { senha } });
  },
};
