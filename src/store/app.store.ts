import { create } from 'zustand';
import type { AuthUser, RoleId } from '../types';

interface AppState {
  user: AuthUser | null;
  userRole: RoleId | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setUser: (user: AuthUser | null) => void;
  setUserRole: (role: RoleId | null) => void;
  setInitialized: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  userRole: null,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setUserRole: (userRole) => set({ userRole }),
  setInitialized: () => set({ isInitialized: true }),
  reset: () =>
    set({ user: null, userRole: null, isAuthenticated: false, isInitialized: false }),
}));