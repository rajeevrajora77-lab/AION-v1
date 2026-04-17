import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, refreshToken, user } = response.data.data;
        set({ user, token, refreshToken, isAuthenticated: true });
        return response.data;
      },

      // Direct auth set — for pages that already have token/user
      setAuth: (token, refreshToken, user) => {
        set({ token, refreshToken, user, isAuthenticated: true });
      },

      signup: async (email, password, name) => {
        const response = await api.post('/auth/signup', { email, password, name });
        const { token, refreshToken, user } = response.data.data;
        set({ user, token, refreshToken, isAuthenticated: true });
        return response.data;
      },

      // Silent token refresh using stored refresh token
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          set({ token: response.data.data.token });
          return true;
        } catch {
          // Refresh token is invalid or expired — force full logout
          get().logout();
          return false;
        }
      },

      logout: async () => {
        try {
          // Notify server (fire-and-forget)
          await api.post('/auth/logout');
        } catch {
          // Ignore server errors — clear client state regardless
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
