import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The client signed in to the client portal. Their data lives in the books store. */
export interface ClientUser {
  clientId: string;
  name: string;
  email: string;
}

interface ClientAuthState {
  token: string | null;
  clientUser: ClientUser | null;
  setAuth: (token: string, user: ClientUser) => void;
  logout: () => void;
}

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      token: null,
      clientUser: null,
      setAuth: (token, clientUser) => set({ token, clientUser }),
      logout: () => set({ token: null, clientUser: null }),
    }),
    { name: 'vaultex-client-auth', version: 2, migrate: () => ({ token: null, clientUser: null }) as never },
  ),
);
