import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // ATOMIC login — single source of truth via Zustand persist
      // Do NOT call localStorage.setItem separately — persist middleware handles it
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data.data;
        set({ user, token, isAuthenticated: true });
        return response.data;
      },

      // Direct login for use by pages that already have token/user (e.g., Login.jsx)
      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      signup: async (email, password, name) => {
        const response = await api.post('/auth/signup', { email, password, name });
        const { token, user } = response.data.data;
        set({ user, token, isAuthenticated: true });
        return response.data;
      },
      
      logout: () => {
        // Single source of truth — Zustand persist auto-clears storage
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      }))
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);
