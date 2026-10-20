import { useNavigate } from 'react-router-dom';
import { Home, TrendingUp, ArrowLeftRight, FileText, User } from 'lucide-react';
import { PortalLayout } from '@/components/shared/PortalLayout';
import { useClientAuthStore } from '@/stores/clientAuth.store';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';

const NAV = [
  { to: '/client/dashboard',    en: 'Home',       ar: 'الرئيسية', icon: Home },
  { to: '/client/trades',       en: 'My trades',  ar: 'صفقاتي',   icon: TrendingUp },
  { to: '/client/transactions', en: 'My money',   ar: 'أموالي',   icon: ArrowLeftRight },
  { to: '/client/statements',   en: 'Statement',  ar: 'الكشف',    icon: FileText },
  { to: '/client/profile',      en: 'Me',         ar: 'حسابي',    icon: User },
];

export function ClientLayout() {
  const { token, clientUser, logout } = useClientAuthStore();
  const client = useBooks((s) => s.clients.find((c) => c.id === clientUser?.clientId));
  const { nameOf } = useTranslation();
  const navigate = useNavigate();
  return (
    <PortalLayout
      signedIn={!!token && !!client}
      loginPath="/client/login"
      titleEn="Client page"
      titleAr="صفحة الزبون"
      userName={nameOf(client)}
      nav={NAV}
      accent="emerald"
      onSignOut={() => { logout(); navigate('/demo'); }}
    />
  );
}
