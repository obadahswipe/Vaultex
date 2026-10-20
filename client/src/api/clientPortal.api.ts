import { useBooks } from '@/stores/books.store';
import { PostingError } from '@/lib/data/ledger';
import { DEMO_PASSWORD } from './auth.api';
import type { ClientUser } from '@/stores/clientAuth.store';

/** In the demo, client@demo.com signs in as the first sample client. */
export const DEMO_CLIENT_EMAIL = 'client@demo.com';

export async function clientLogin(email: string, password: string): Promise<{ token: string; user: ClientUser }> {
  const { clients } = useBooks.getState();
  const e = email.trim().toLowerCase();
  const client = e === DEMO_CLIENT_EMAIL ? clients[0] : clients.find((c) => c.email?.toLowerCase() === e);
  if (!client || !client.active || password !== DEMO_PASSWORD) {
    throw new PostingError('The email or password is not right.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }
  return { token: `client.${client.id}.${Date.now()}`, user: { clientId: client.id, name: client.name, email: e } };
}
