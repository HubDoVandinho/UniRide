import { create } from 'zustand';
import { amizadeService } from '@/services/amizade.service';
import { caronaService } from '@/services/carona.service';
import { useAuthStore } from './auth.store';

interface NotificationState {
  amizadesPendentes: number;
  solicitacoesPendentes: number;
  caronasComPendentes: number[];
  solicitacoesVistas: number[];
  // Passageiro: solicitações aprovadas ainda não vistas
  aprovacoesNaoVistas: number;
  aprovacoesVistas: number[];
  // Motorista: caronas com novos passageiros embarcados não vistos
  caronasComEmbarcados: number[];  // caronaIds
  embarcadosVistos: number[];      // solicitacaoIds já vistos
  // Passageiro: caronas EM_ANDAMENTO ainda não vistas
  caronasIniciadasVistas: number[];
  // Chat: caronas com mensagens não lidas
  caronasComMensagemNova: number[];
  ultimaMensagemVista: Record<number, number>; // caronaId → último messageId visto
  // Passageiro: solicitações recusadas/canceladas ainda não vistas
  negativosNaoVistos: number;
  negativosVistos: number[];
}

interface NotificationActions {
  atualizar: () => Promise<void>;
  marcarAmizadesVistas: () => void;
  marcarSolicitacoesVistas: () => void;
  marcarCaronaVista: (caronaId: number) => void;
  marcarSolicitacoesVistasDaCarona: (solicitacaoIds: number[]) => void;
  marcarAprovacoesVistas: () => void;
  marcarAprovacaoVista: (solicitacaoId: number) => void;
  marcarEmbarcadosVistos: (caronaId: number) => void;
  marcarCaronaIniciadaVista: (caronaId: number) => void;
  marcarMensagemNova: (caronaId: number) => void;
  marcarChatVisto: (caronaId: number, ultimoId: number) => void;
  marcarNegativoVisto: (solicitacaoId: number) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  amizadesPendentes: 0,
  solicitacoesPendentes: 0,
  caronasComPendentes: [],
  solicitacoesVistas: [],
  aprovacoesNaoVistas: 0,
  aprovacoesVistas: [],
  caronasComEmbarcados: [],
  embarcadosVistos: [],
  caronasIniciadasVistas: [],
  caronasComMensagemNova: [],
  ultimaMensagemVista: {},
  negativosNaoVistos: 0,
  negativosVistos: [],

  atualizar: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      const [pendentes, solicitacoes, minhasSolic] = await Promise.allSettled([
        amizadeService.listarPendentes(),
        caronaService.listarSolicitacoesRecebidas(),
        caronaService.listarMinhasSolicitacoes(),
      ]);

      const pendentesIds: number[] =
        solicitacoes.status === 'fulfilled'
          ? [...new Set(
              solicitacoes.value
                .filter((s) => s.status === 'PENDENTE')
                .map((s) => s.caronaId),
            )]
          : [];

      const { aprovacoesVistas, embarcadosVistos, negativosVistos } = get();

      const aprovacoesNaoVistas =
        minhasSolic.status === 'fulfilled'
          ? minhasSolic.value.filter(
              (s) => s.status === 'APROVADA' && !aprovacoesVistas.includes(s.id)
            ).length
          : 0;

      const negativosNaoVistos =
        minhasSolic.status === 'fulfilled'
          ? minhasSolic.value.filter(
              (s) => (s.status === 'RECUSADA' || s.status === 'CANCELADA') && !negativosVistos.includes(s.id)
            ).length
          : 0;

      const caronasComEmbarcados: number[] =
        solicitacoes.status === 'fulfilled'
          ? [...new Set(
              solicitacoes.value
                .filter((s) => s.status === 'EMBARCADO' && !embarcadosVistos.includes(s.id))
                .map((s) => s.caronaId),
            )]
          : [];

      set({
        amizadesPendentes:
          pendentes.status === 'fulfilled' ? (pendentes.value?.length ?? 0) : 0,
        solicitacoesPendentes: pendentesIds.length,
        caronasComPendentes: pendentesIds,
        aprovacoesNaoVistas,
        caronasComEmbarcados,
        negativosNaoVistos,
      });

      // Verifica mensagens novas nos chats das caronas ativas
      const { user } = useAuthStore.getState();
      if (minhasSolic.status === 'fulfilled' && user) {
        const { ultimaMensagemVista } = get();
        const ativas = minhasSolic.value.filter((s) => ['APROVADA', 'EMBARCADO'].includes(s.status));
        const novas: number[] = [];
        for (const s of ativas) {
          try {
            const msgs = await caronaService.listarMensagens(s.caronaId);
            const ultimaVista = ultimaMensagemVista[s.caronaId] ?? 0;
            const temNova = msgs.some(
              (m) => m.tipo !== 'PIX_KEY' && m.remetenteId !== user.id && m.id > ultimaVista,
            );
            if (temNova) novas.push(s.caronaId);
          } catch { /* silent */ }
        }
        if (novas.length > 0) {
          set((state) => ({
            caronasComMensagemNova: [...new Set([...state.caronasComMensagemNova, ...novas])],
          }));
        }
      }
    } catch {
      // silencia erros de rede
    }
  },

  marcarAmizadesVistas: () => set({ amizadesPendentes: 0 }),
  marcarSolicitacoesVistas: () => set({ solicitacoesPendentes: 0, caronasComPendentes: [], solicitacoesVistas: [] }),
  marcarCaronaVista: (caronaId) =>
    set((state) => ({
      caronasComPendentes: state.caronasComPendentes.filter((id) => id !== caronaId),
      solicitacoesPendentes: Math.max(0, state.solicitacoesPendentes - 1),
    })),
  marcarSolicitacoesVistasDaCarona: (solicitacaoIds) =>
    set((state) => ({
      solicitacoesVistas: [...new Set([...state.solicitacoesVistas, ...solicitacaoIds])],
    })),
  marcarEmbarcadosVistos: (caronaId) => {
    caronaService.listarSolicitacoesRecebidas().then((lista) => {
      const ids = lista
        .filter((s) => s.caronaId === caronaId && s.status === 'EMBARCADO')
        .map((s) => s.id);
      set((state) => ({
        caronasComEmbarcados: state.caronasComEmbarcados.filter((id) => id !== caronaId),
        embarcadosVistos: [...new Set([...state.embarcadosVistos, ...ids])],
      }));
    }).catch(() => {});
  },

  marcarAprovacoesVistas: () => {
    caronaService.listarMinhasSolicitacoes().then((lista) => {
      const ids = lista.filter((s) => s.status === 'APROVADA').map((s) => s.id);
      set((state) => ({
        aprovacoesNaoVistas: 0,
        aprovacoesVistas: [...new Set([...state.aprovacoesVistas, ...ids])],
      }));
    }).catch(() => set({ aprovacoesNaoVistas: 0 }));
  },

  marcarAprovacaoVista: (solicitacaoId) =>
    set((state) => ({
      aprovacoesNaoVistas: Math.max(0, state.aprovacoesNaoVistas - 1),
      aprovacoesVistas: [...new Set([...state.aprovacoesVistas, solicitacaoId])],
    })),

  marcarCaronaIniciadaVista: (caronaId) =>
    set((state) => ({
      caronasIniciadasVistas: [...new Set([...state.caronasIniciadasVistas, caronaId])],
    })),

  marcarMensagemNova: (caronaId) =>
    set((state) => ({
      caronasComMensagemNova: state.caronasComMensagemNova.includes(caronaId)
        ? state.caronasComMensagemNova
        : [...state.caronasComMensagemNova, caronaId],
    })),

  marcarChatVisto: (caronaId, ultimoId) =>
    set((state) => ({
      caronasComMensagemNova: state.caronasComMensagemNova.filter((id) => id !== caronaId),
      ultimaMensagemVista: { ...state.ultimaMensagemVista, [caronaId]: ultimoId },
    })),

  marcarNegativoVisto: (solicitacaoId) =>
    set((state) => ({
      negativosNaoVistos: Math.max(0, state.negativosNaoVistos - 1),
      negativosVistos: [...new Set([...state.negativosVistos, solicitacaoId])],
      aprovacoesVistas: state.aprovacoesVistas.filter((id) => id !== solicitacaoId),
    })),
}));
