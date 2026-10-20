import { useNavigate } from 'react-router-dom';
import { Home, HandCoins, Users, User } from 'lucide-react';
import { PortalLayout } from '@/components/shared/PortalLayout';
import { useIBAuthStore } from '@/stores/ibAuth.store';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';

const NAV = [
  { to: '/ib/dashboard',   en: 'Home',       ar: 'الرئيسية', icon: Home },
  { to: '/ib/commissions', en: 'My pay',     ar: 'أجري',     icon: HandCoins },
  { to: '/ib/clients',     en: 'My clients', ar: 'زبائني',   icon: Users },
  { to: '/ib/profile',     en: 'Me',         ar: 'حسابي',    icon: User },
];

export function IBLayout() {
  const { token, ibUser, logout } = useIBAuthStore();
  const ib = useBooks((s) => s.ibs.find((i) => i.id === ibUser?.ibId));
  const { nameOf } = useTranslation();
  const navigate = useNavigate();
  return (
    <PortalLayout
      signedIn={!!token && !!ib}
      loginPath="/ib/login"
      titleEn="Partner page"
      titleAr="صفحة الشريك"
      userName={nameOf(ib)}
      nav={NAV}
      accent="amber"
      onSignOut={() => { logout(); navigate('/demo'); }}
    />
  );
}
