export type TipoParticipante = 'MOTORISTA' | 'PASSAGEIRO' | 'ADMIN';

export type StatusParticipante =
  | 'PENDENTE_VERIFICACAO'
  | 'ATIVO'
  | 'INATIVO'
  | 'SUSPENSO'
  | 'BLOQUEADO';

export type StatusDenuncia = 'PENDENTE' | 'ARQUIVADA' | 'SUSPENSAO_APLICADA';

export type MotivoDenuncia =
  | 'NAO_APARECEU'
  | 'COMPORTAMENTO_INADEQUADO'
  | 'PERFIL_FALSO'
  | 'VEICULO_DIFERENTE'
  | 'COBRANCA_FORA_APP'
  | 'ASSEDIO'
  | 'OUTRO';

export interface BloqueioResponse {
  id: number;
  bloqueadoId: number;
  nomeBloqueado?: string;
  fotoBloqueado?: string;
  criadoEm: string;
}

export interface DenunciaResponse {
  id: number;
  denuncianteId: number;
  nomeDenunciante?: string;
  denunciadoId: number;
  nomeDenunciado?: string;
  caronaId?: number;
  motivo: MotivoDenuncia;
  descricao?: string;
  status: StatusDenuncia;
  notaAdmin?: string;
  criadoEm: string;
  revisadoEm?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type StatusPagamento = 'PENDENTE' | 'COMPROVANTE_ENVIADO' | 'PAGO_CONFIRMADO';
export type TipoMensagem = 'TEXTO' | 'COMPROVANTE' | 'PIX_KEY';

export type StatusCarona =
  | 'AGENDADA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type StatusSolicitacao =
  | 'PENDENTE'
  | 'APROVADA'
  | 'RECUSADA'
  | 'EMBARCADO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type StatusRotina = 'ATIVA' | 'PAUSADA' | 'ENCERRADA';

export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';

export type Turno = 'MANHA' | 'TARDE' | 'NOITE';

export interface TipoPreferenciaResponse {
  id: number;
  nome: string;
  descricao?: string;
  custom?: boolean;
}

export interface InstituicaoInfo {
  id: number;
  nome: string;
  sigla: string;
  bairro?: string;
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}

export interface EnderecoResponse {
  id: number;
  nome?: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}

export interface TelefoneResponse {
  id: number;
  ddd: string;
  numero: string;
  tipo: string;
  principal: boolean;
}

export interface VeiculoResponse {
  id: number;
  tipo: TipoVeiculo;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  placa: string;
  capacidade: number;
  temSeguro?: boolean;
  acessivel?: boolean;
}

export interface ParticipanteResponse {
  id: number;
  tipo: TipoParticipante;
  nome: string;
  username: string;
  emailPessoal: string;
  emailInstitucional?: string;
  cpf: string;
  miniBiografia?: string;
  fotoPerfilUrl?: string;
  verificado: boolean;
  status: StatusParticipante;
  criadoEm: string;
  mediaAvaliacoes?: number;
  instituicao?: InstituicaoInfo;
  enderecos: EnderecoResponse[];
  telefones: TelefoneResponse[];
  preferencias: TipoPreferenciaResponse[];
  // Motorista
  cnh?: string;
  validadeCnh?: string;
  aprovadoAdmin?: boolean;
  veiculo?: VeiculoResponse;    // primeiro veículo (compat)
  veiculos?: VeiculoResponse[]; // todos os veículos
  // Passageiro
  necessidadesEspeciais?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  participante: ParticipanteResponse;
}

export interface ApiResponse<T> {
  dados: T;
  mensagem?: string;
  sucesso?: boolean;
}

export interface CaronaResponse {
  id: number;
  rotinaId?: number;
  motoristaId: number;
  origem: string;
  bairroOrigem: string;
  destino: string;
  bairroDestino: string;
  latOrigem: number;
  lngOrigem: number;
  latDestino: number;
  lngDestino: number;
  data: string;
  horarioSaida: string;
  vagasTotal: number;
  vagasDisponiveis: number;
  valorSugerido?: number;
  custoTotal?: number;
  status: StatusCarona;
  direcao?: 'IDA' | 'VOLTA';
  observacoes?: string;
  nome?: string;
  pixKey?: string;
  linkGoogleMaps?: string;
  linkWaze?: string;
  distanciaKm?: number;
  jaAvaliouPassageiros?: boolean;
  eParticipante?: boolean;
  veiculoPlaca?: string;
  veiculoTipo?: string;
  veiculoMarca?: string;
  veiculoModelo?: string;
}

export interface RotinaResponse {
  id: number;
  motoristaId: number;
  origem: string;
  bairroOrigem: string;
  destino: string;
  bairroDestino: string;
  latOrigem: number;
  lngOrigem: number;
  latDestino: number;
  lngDestino: number;
  raioAceito: number;
  diasDaSemana: DiaSemana[];
  horarioSaida: string;
  turno: Turno;
  valorSugerido?: number;
  vagasTotal: number;
  modoFixo: boolean;
  dataInicio: string;
  dataFim?: string;
  status: StatusRotina;
  nome?: string;
  observacoes?: string;
  pixKey?: string;
  direcao?: 'IDA' | 'VOLTA';
  distanciaKm?: number;
}

export interface SolicitacaoResponse {
  id: number;
  caronaId: number;
  passageiroId: number;
  nomePassageiro?: string;
  fotoPassageiro?: string;
  latDestino?: number;
  lngDestino?: number;
  enderecoDestino?: string;
  nomeCarona?: string;
  direcao?: 'IDA' | 'VOLTA';
  status: StatusSolicitacao;
  statusPagamento?: StatusPagamento;
  mensagem?: string;
  pinEmbarque?: string;
  criadoEm: string;
  jaAvaliouMotorista?: boolean;
  dataCarona?: string;
  horarioSaida?: string;
  vagasDisponiveis?: number;
  vagasTotal?: number;
}

export interface MensagemResponse {
  id: number;
  caronaId: number;
  remetenteId: number;
  nomeRemetente?: string;
  fotoRemetente?: string;
  conteudo?: string;
  imagemBase64?: string;
  tipo: TipoMensagem;
  criadoEm: string;
}

export interface MensagemRequest {
  tipo: TipoMensagem;
  conteudo?: string;
  imagemBase64?: string;
}

export interface AvaliacaoResponse {
  id: number;
  avaliadorId: number;
  avaliadoId: number;
  caronaId: number;
  nota: number;
  comentario?: string;
  tags?: string[];
  criadoEm: string;
}

// ── Request types ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface EnderecoPayload {
  nome?: string;
  cep: string;
  rua: string;
  numero?: string;
  bairro: string;
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}

export interface CadastroPassageiroRequest {
  nome: string;
  username?: string;
  emailPessoal: string;
  emailInstitucional: string;
  senha: string;
  cpf: string;
  instituicaoId: number;
  necessidadesEspeciais?: string;
  miniBiografia: string;
  endereco: EnderecoPayload;
}

export interface CadastroMotoristaRequest {
  nome: string;
  username?: string;
  emailPessoal: string;
  emailInstitucional: string;
  senha: string;
  cpf: string;
  cnh: string;
  instituicaoId: number;
  miniBiografia: string;
  endereco: EnderecoPayload;
}

export interface AtualizarPerfilRequest {
  nome?: string;
  miniBiografia?: string;
  fotoPerfilUrl?: string;
  necessidadesEspeciais?: string;
  validadeCnh?: string;
}

export interface EnderecoRequest {
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  lat?: number;
  lng?: number;
}

export interface AvaliarRequest {
  avaliadoId: number;
  caronaId: number;
  nota: number;
  comentario?: string;
  tags?: string[];
}

export interface CriarRotinaRequest {
  origem: string;
  bairroOrigem: string;
  destino: string;
  bairroDestino: string;
  latOrigem?: number;
  lngOrigem?: number;
  latDestino?: number;
  lngDestino?: number;
  raioAceito?: number;
  diasDaSemana: DiaSemana[];
  horarioSaida: string;
  valorSugerido?: number;
  vagasTotal: number;
  modoFixo?: boolean;
  dataInicio: string;
  dataFim?: string;
  nome?: string;
  observacoes?: string;
  pixKey?: string;
  direcao: 'IDA' | 'VOLTA';
}

export interface AtualizarRotinaRequest {
  nome?: string;
  horarioSaida?: string;
  diasDaSemana?: DiaSemana[];
  raioAceito?: number;
  observacoes?: string;
  pixKey?: string;
}

export interface PerfilPublicoResponse {
  id: number;
  nome: string;
  username?: string;
  fotoPerfil?: string;
  instituicao?: string;
  tipo: TipoParticipante;
  avaliacaoMedia?: number;
  verificado?: boolean;
  miniBiografia?: string;
  preferencias?: string[];
  // Presentes apenas em resultados de busca
  statusAmizade?: StatusRelacaoAmizade;
  amizadeId?: number;
  // Presente no perfil público individual
  totalAmigos?: number;
}

export type StatusAmizade = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'BLOQUEADA';

export type StatusRelacaoAmizade =
  | 'NENHUMA'
  | 'PENDENTE_ENVIADA'
  | 'PENDENTE_RECEBIDA'
  | 'ACEITA'
  | 'BLOQUEADA';

export interface AmizadeResponse {
  id: number;
  status: StatusAmizade;
  criadoEm: string;
  atualizadoEm: string;
  solicitante: PerfilPublicoResponse;
  destinatario: PerfilPublicoResponse;
}

export interface SolicitarVagaRequest {
  latDestino?: number;
  lngDestino?: number;
  enderecoDestino?: string;
  mensagem?: string;
}

export type TipoVeiculo = 'CARRO' | 'MOTOCICLETA' | 'VAN';

export interface WaypointResponse {
  passageiroId: number;
  endereco: string;
  lat: number;
  lng: number;
  distanciaOrigemKm: number;
}

export interface RotaResponse {
  linkGoogleMaps: string;
  linkWaze: string;
  waypoints: WaypointResponse[];
  distanciaTotalKm: number;
}

export interface CadastroVeiculoRequest {
  placa: string;
  tipo: TipoVeiculo;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  capacidade: number;
  temSeguro?: boolean;
  acessivel?: boolean;
  qtdPortas?: number;
  cilindrada?: string;
  temBauleto?: boolean;
}

export interface PromoverMotoristaRequest {
  cnh: string;
  validadeCnh?: string; // yyyy-MM-dd
  miniBiografia?: string;
  veiculo: {
    placa: string;
    tipo: TipoVeiculo;
    modelo: string;
    marca: string;
    ano: number;
    cor: string;
    capacidade: number;
    temSeguro?: boolean;
    acessivel?: boolean;
  };
}
