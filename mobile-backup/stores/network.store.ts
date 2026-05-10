import { create } from 'zustand';

interface NetworkState {
  isOffline: boolean;
  setOffline: (value: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  setOffline: (value) => set({ isOffline: value }),
}));
