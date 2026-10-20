import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export interface PortalNavItem { to: string; en: string; ar: string; icon: typeof LogOut }

interface PortalLayoutProps {
  signedIn: boolean;
  loginPath: string;
  titleEn: string;
  titleAr: string;
  userName: string;
  nav: PortalNavItem[];
  accent: 'emerald' | 'amber';
  onSignOut: () => void;
}

const ACCENT = {
  emerald: { logo: 'from-emerald-500 to-teal-600', active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { logo: 'from-amber-500 to-orange-600', active: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',   text: 'text-amber-600 dark:text-amber-400' },
};

/** A simple layout for the client and partner portals: a top bar, tabs, and the page. */
export function PortalLayout({ signedIn, loginPath, titleEn, titleAr, userName, nav, accent, onSignOut }: PortalLayoutProps) {
  const { theme, toggleTheme } = useUIStore();
  const { t, tr, lang, toggleLang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const a = ACCENT[accent];

  useEffect(() => { if (!signedIn) navigate(loginPath, { replace: true }); }, [signedIn, loginPath, navigate]);
  if (!signedIn) return null;

  return (
    <div className="min-h-screen bg-background gradient-bg-soft">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className={cn('grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br', a.logo)}>
            <span className="text-[13px] font-bold text-white">FX</span>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight">{t('app.name')}</p>
            <p className={cn('text-[11px] font-semibold leading-tight', a.text)}>{tr(titleEn, titleAr)}</p>
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <button onClick={toggleLang} className="inline-flex h-8 items-center rounded-lg border border-border/70 bg-card px-2.5 text-[12px] font-bold hover:bg-accent">
              {lang === 'en' ? 'عربي' : 'English'}
            </button>
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('nav.toggleTheme')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="hidden px-2 text-[13px] font-medium sm:inline">{userName}</span>
            <button onClick={onSignOut} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">{tr('Sign out', 'خروج')}</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 sm:flex sm:px-6">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors', isActive ? a.active : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}>
              <n.icon className="h-4 w-4" />{tr(n.en, n.ar)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8">
        <div key={location.pathname} className="animate-slide-up"><Outlet /></div>
      </main>

      {/* Phone tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-border bg-card/95 backdrop-blur-md sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium', isActive ? a.text : 'text-muted-foreground')}>
            <n.icon className="h-5 w-5" />{tr(n.en, n.ar)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
