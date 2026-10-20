import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The partner (IB) signed in to the partner portal. Their data lives in the books store. */
export interface IBUser {
  ibId: string;
  name: string;
  email: string;
}

interface IBAuthState {
  token: string | null;
  ibUser: IBUser | null;
  setAuth: (token: string, user: IBUser) => void;
  logout: () => void;
}

export const useIBAuthStore = create<IBAuthState>()(
  persist(
    (set) => ({
      token: null,
      ibUser: null,
      setAuth: (token, ibUser) => set({ token, ibUser }),
      logout: () => set({ token: null, ibUser: null }),
    }),
    { name: 'vaultex-ib-auth', version: 2, migrate: () => ({ token: null, ibUser: null }) as never },
  ),
);
