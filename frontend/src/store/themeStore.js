import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme store — manages dark/light/auto theme preference.
 * - 'auto': follows system prefers-color-scheme
 * - 'dark' / 'light': manual override
 * Persisted to localStorage under 'aion-theme'.
 */

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light' | 'auto'

      /** Resolve the effective theme (never 'auto') */
      resolvedTheme: () => {
        const t = get().theme;
        return t === 'auto' ? getSystemTheme() : t;
      },

      setTheme: (newTheme) => {
        set({ theme: newTheme });
        const resolved = newTheme === 'auto' ? getSystemTheme() : newTheme;
        applyTheme(resolved);
      },

      /** Call once on app boot to apply the stored theme */
      initTheme: () => {
        const t = get().theme;
        const resolved = t === 'auto' ? getSystemTheme() : t;
        applyTheme(resolved);

        // Listen for system theme changes when in 'auto' mode
        if (typeof window !== 'undefined') {
          const mq = window.matchMedia('(prefers-color-scheme: dark)');
          mq.addEventListener('change', () => {
            if (get().theme === 'auto') {
              applyTheme(getSystemTheme());
            }
          });
        }
      },
    }),
    {
      name: 'aion-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
