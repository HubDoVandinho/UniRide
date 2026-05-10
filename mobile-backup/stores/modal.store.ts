import { create } from 'zustand';
import { AppModalButton } from '@/components/ui/AppModal';

interface ModalOptions {
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons: AppModalButton[];
}

interface ModalState {
  visible: boolean;
  options: ModalOptions | null;
  show: (options: ModalOptions) => void;
  hide: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  visible: false,
  options: null,
  show: (options) => set({ visible: true, options }),
  hide: () => set({ visible: false }),
}));
