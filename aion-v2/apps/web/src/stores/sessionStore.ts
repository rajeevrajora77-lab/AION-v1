import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessionId: string | null;
  taskId: string | null;
  setSession: (sessionId: string) => void;
  setTask: (taskId: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      taskId: null,
      setSession: (sessionId) => set({ sessionId }),
      setTask: (taskId) => set({ taskId }),
      clearSession: () => set({ sessionId: null, taskId: null }),
    }),
    {
      name: 'aion-session-storage',
    }
  )
);
