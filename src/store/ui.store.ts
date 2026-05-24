import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UiState {
  sidebarOpen: boolean;
  toasts: Toast[];
  // Modal stack
  activeModal: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  openModal: (name: string) => void;
  closeModal: () => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toasts: [],
  activeModal: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToast: (message, type) => {
    const id = `toast_${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}));