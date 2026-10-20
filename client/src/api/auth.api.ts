import { useBooks } from '@/stores/books.store';
import { PostingError } from '@/lib/data/ledger';

export interface LoginInput { email: string; password: string; }

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  permissions: string[];
}

/** Every demo login uses this password. */
export const DEMO_PASSWORD = 'Demo@123456';

/**
 * Demo sign-in. It checks the staff list kept in the app, so it works the same
 * on the live site and on a laptop. A real server login replaces this later.
 */
export const authLogin = async (data: LoginInput): Promise<LoginResponse> => {
  const email = data.email.trim().toLowerCase();
  const user = useBooks.getState().users.find((u) => u.email.toLowerCase() === email && u.active);
  if (!user || data.password !== DEMO_PASSWORD) {
    throw new PostingError('The email or password is not right.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }
  useBooks.getState().setActingAs(user.email);
  return {
    token: `demo.${user.id}.${Date.now()}`,
    user: { id: user.id, email: user.email, full_name: user.name, role: user.role },
    permissions: [],
  };
};

export const authLogout = async () => undefined;
