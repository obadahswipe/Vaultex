import { useBooks } from '@/stores/books.store';
import { PostingError } from '@/lib/data/ledger';
import { DEMO_PASSWORD } from './auth.api';
import type { IBUser } from '@/stores/ibAuth.store';

/** In the demo, ib@demo.com signs in as the first sample partner. */
export const DEMO_IB_EMAIL = 'ib@demo.com';

export async function ibLogin(email: string, password: string): Promise<{ token: string; user: IBUser }> {
  const { ibs } = useBooks.getState();
  const e = email.trim().toLowerCase();
  const ib = e === DEMO_IB_EMAIL ? ibs[0] : ibs.find((i) => i.email?.toLowerCase() === e);
  if (!ib || !ib.active || password !== DEMO_PASSWORD) {
    throw new PostingError('The email or password is not right.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }
  return { token: `ib.${ib.id}.${Date.now()}`, user: { ibId: ib.id, name: ib.name, email: e } };
}
