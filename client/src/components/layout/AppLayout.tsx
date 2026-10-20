import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { QuickActionFAB } from '@/components/shared/QuickActionFAB';
import { UniversalSearchPalette } from '@/components/shared/UniversalSearchPalette';
import { KeyboardHelpModal } from '@/components/shared/KeyboardHelpModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { WifiOff, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

/* ── Offline banner ───────────────────────────────────────── */
function OfflineBanner() {
  const { tr } = useTranslation();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOffline = () => { setOffline(true); setDismissed(false); };
    const handleOnline  = () => {
      setOffline(false);
      setDismissed(false);
      try { localStorage.setItem('vaultex-last-sync', new Date().toISOString()); } catch {}
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="relative z-50 flex items-center gap-3 bg-amber-500/95 px-4 py-2.5 text-sm font-medium text-amber-950 backdrop-blur-sm">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">{tr("You are offline. You can still look around, and your changes are saved on this device.", 'أنت غير متصل بالإنترنت. ما زال بإمكانك التصفح، وتُحفظ تغييراتك على هذا الجهاز.')}</span>
      <button onClick={() => setDismissed(true)} className="rounded-lg p-1 hover:bg-amber-600/30 transition-colors" aria-label={tr('Close', 'إغلاق')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Main layout ──────────────────────────────────────────── */
function AppLayoutInner() {
  const [searchActive, setSearchActive]   = useState(false);
  const [helpOpen,     setHelpOpen]       = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useKeyboardShortcuts([
    { key: 'k',  ctrl: true,  action: () => setSearchActive(true),  description: 'Open search' },
    { key: '?',               action: () => setHelpOpen((o) => !o), description: 'Show shortcuts' },
    // Go-to shortcuts (G + letter)
    { key: 'd',  meta: true,  action: () => navigate('/'),              description: 'Dashboard' },
  ]);

  // G+key navigation via two-key detection
  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout>;
    const NAV_MAP: Record<string, string> = {
      d: '/', h: '/', o: '/operations', c: '/clients',
      r: '/reports', t: '/trades', e: '/entries', b: '/treasury',
    };
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'g' || e.key === 'G') { pendingG = true; clearTimeout(timer); timer = setTimeout(() => { pendingG = false; }, 1000); return; }
      if (pendingG && NAV_MAP[e.key.toLowerCase()]) { e.preventDefault(); navigate(NAV_MAP[e.key.toLowerCase()]); pendingG = false; }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer); };
  }, [navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onSearchClick={() => setSearchActive(true)} />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto gradient-bg-soft px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-20 md:pb-10">
          <div className="mx-auto w-full max-w-[1400px]">
            <div key={location.pathname} className="animate-slide-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
      <QuickActionFAB />
      <UniversalSearchPalette open={searchActive} onClose={() => setSearchActive(false)} />
      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export function AppLayout() {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/demo" replace />;
  return <AppLayoutInner />;
}
