import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLogin } from '@/components/shared/PortalLogin';
import { useIBAuthStore } from '@/stores/ibAuth.store';
import { ibLogin, DEMO_IB_EMAIL } from '@/api/ib.api';

export default function IBLogin() {
  const { token, setAuth } = useIBAuthStore();
  const navigate = useNavigate();
  useEffect(() => { if (token) navigate('/ib/dashboard', { replace: true }); }, [token, navigate]);
  return (
    <PortalLogin
      titleEn="Partner page"
      titleAr="صفحة الشريك"
      demoEmail={DEMO_IB_EMAIL}
      accent="amber"
      onLogin={async (email, password) => {
        const r = await ibLogin(email, password);
        setAuth(r.token, r.user);
        navigate('/ib/dashboard', { replace: true });
      }}
    />
  );
}
