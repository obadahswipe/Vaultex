import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLogin } from '@/components/shared/PortalLogin';
import { useClientAuthStore } from '@/stores/clientAuth.store';
import { clientLogin, DEMO_CLIENT_EMAIL } from '@/api/clientPortal.api';

export default function ClientLogin() {
  const { token, setAuth } = useClientAuthStore();
  const navigate = useNavigate();
  useEffect(() => { if (token) navigate('/client/dashboard', { replace: true }); }, [token, navigate]);
  return (
    <PortalLogin
      titleEn="Client page"
      titleAr="صفحة الزبون"
      demoEmail={DEMO_CLIENT_EMAIL}
      accent="emerald"
      onLogin={async (email, password) => {
        const r = await clientLogin(email, password);
        setAuth(r.token, r.user);
        navigate('/client/dashboard', { replace: true });
      }}
    />
  );
}
