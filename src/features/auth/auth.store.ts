import { create } from 'zustand';
import { onAuthChange } from '../../lib/firebase/auth';
import type { AuthUser } from '../../types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null, isLoading: false }),

  initialize: () => {
    set({ isLoading: true });
    const unsubscribe = onAuthChange((user) => {
      set({ user, isAuthenticated: user !== null, isLoading: false });
    });
    return unsubscribe;
  },
}));
