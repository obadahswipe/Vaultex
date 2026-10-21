import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  /** Menu groups the person folded away. Remembered on this device. */
  closedSections: string[];
  toggleSection: (id: string) => void;
  openSection: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      closedSections: [],
      toggleSection: (id) => set((s) => ({
        closedSections: s.closedSections.includes(id) ? s.closedSections.filter((x) => x !== id) : [...s.closedSections, id],
      })),
      openSection: (id) => set((s) => (s.closedSections.includes(id) ? { closedSections: s.closedSections.filter((x) => x !== id) } : s)),
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ theme: next });
      },
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'ui-storage', partialize: (s) => ({ theme: s.theme, closedSections: s.closedSections }) }
  )
);
