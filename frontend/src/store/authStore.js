import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { normalizeUser } from '../utils/userDisplay';

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
        set({
          user: normalizeUser(user),
          token,
          refreshToken,
          isAuthenticated: true,
        });
        return response.data;
      },

      setAuth: (token, refreshToken, user) => {
        set({
          token,
          refreshToken,
          user: normalizeUser(user),
          isAuthenticated: true,
        });
      },

      signup: async (email, password, name) => {
        const response = await api.post('/auth/signup', { email, password, name });
        const { token, refreshToken, user } = response.data.data;
        set({
          user: normalizeUser(user),
          token,
          refreshToken,
          isAuthenticated: true,
        });
        return response.data;
      },

      /** Refresh profile from server (call after login and on app load when token exists). */
      fetchCurrentUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { data } = await api.get('/auth/me');
          const payload = data.data;
          set({ user: normalizeUser(payload) });
        } catch {
          get().logout();
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          set({ token: response.data.data.token });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore server errors — clear client state regardless
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: normalizeUser({ ...state.user, ...updates }),
        })),
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
