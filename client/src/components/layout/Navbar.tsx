import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Moon, Sun, LogOut, Bell, Search, ChevronDown, UserCircle2, AlertTriangle, Info, ShieldAlert, Check, X, Repeat,
} from 'lucide-react';
import { AskVaultexButton } from '@/components/ai/AskVaultex';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useBooks } from '@/stores/books.store';
import { cn } from '@/lib/utils';
import { InstallPWAButton } from '@/components/shared/InstallPWAButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useActingUser, useAlerts } from '@/lib/data/hooks';
import { roleLabel } from '@/lib/roles';

function Initials({ name, small }: { name: string; small?: boolean }) {
  const parts = name.trim().split(' ');
  const ini = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return (
    <div className={cn(
      'grid shrink-0 place-items-center rounded-xl gradient-bg font-bold text-white shadow-shadow-1 ring-2 ring-primary/20',
      small ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs',
    )}>
      {ini.toUpperCase()}
    </div>
  );
}

export function Navbar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { theme, toggleTheme } = useUIStore();
  const { t, tr, lang, toggleLang } = useTranslation();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const alerts = useAlerts();
  const dismissAlert = useBooks((s) => s.dismissAlert);
  const users = useBooks((s) => s.users);
  const setActingAs = useBooks((s) => s.setActingAs);
  const me = useActingUser();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/demo');
  };

  const openAlert = (a: (typeof alerts)[number]) => {
    setNotifOpen(false);
    if (a.linkedRequestId) navigate(`/operations?open=${a.linkedRequestId}`);
    else if (a.type === 'reconciliation_gap') navigate('/reconciliation');
    else if (a.linkedAccountCode) navigate(`/clients?account=${a.linkedAccountCode}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 sm:px-6">
      {/* Phone brand */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="grid h-8 w-8 place-items-center rounded-xl gradient-bg"><span className="text-[11px] font-bold text-white">FX</span></div>
        <span className="hidden text-sm font-bold min-[420px]:inline">{t('app.name')}</span>
      </div>

      {/* Search */}
      <div className="hidden flex-1 sm:flex">
        <button
          type="button"
          onClick={onSearchClick}
          className="relative flex h-9 w-full max-w-sm items-center gap-2 rounded-xl border border-border/60 bg-card/80 ps-9 pe-12 text-sm text-muted-foreground transition-all duration-150 hover:border-primary/30 hover:bg-card hover:shadow-shadow-1"
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <span className="truncate text-[13px]">{tr('Find a client, account or page…', 'ابحث عن زبون أو حساب أو صفحة…')}</span>
          <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded-md border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex">⌘K</kbd>
        </button>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <span className="hidden sm:inline-flex"><AskVaultexButton /></span>
        <span className="sm:hidden"><AskVaultexButton compact /></span>
        <Button variant="ghost" size="icon" onClick={onSearchClick} className="h-9 w-9 text-muted-foreground sm:hidden" aria-label={tr('Search', 'بحث')}>
          <Search className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={toggleLang}
          className="inline-flex h-8 items-center rounded-lg border border-border/70 bg-card px-2.5 text-[12px] font-bold text-foreground transition-all duration-150 hover:bg-accent hover:border-primary/30"
          title={t('nav.toggleLanguage')}
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>

        <InstallPWAButton compact />

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground hover:text-foreground" title={t('nav.toggleTheme')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Things to look at */}
        <div className="relative" ref={panelRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label={tr('Things to look at', 'أشياء تحتاج انتباهك')}
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute end-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-shadow-1">
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-card-lg absolute end-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden animate-slide-up-sm">
              <div className="border-b border-border/40 bg-background/40 px-4 py-3 backdrop-blur">
                <p className="text-[13px] font-semibold">{tr('Things to look at', 'أشياء تحتاج انتباهك')}</p>
                <p className="text-[11px] text-muted-foreground">{tr('Vaultex checks your numbers and points at problems.', 'فولتكس يراجع أرقامك ويدلّك على المشاكل.')}</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 && (
                  <div className="py-10 text-center text-[13px] text-muted-foreground">
                    <Check className="mx-auto mb-2 h-6 w-6 text-success" />
                    {tr('All good. Nothing needs you right now.', 'كل شيء جيد. لا شيء يحتاجك الآن.')}
                  </div>
                )}
                {alerts.slice(0, 12).map((a) => (
                  <div key={a.id} className="group flex items-start gap-2 border-b border-border/40 px-4 py-3 transition-colors last:border-0 hover:bg-accent/40">
                    {a.severity === 'critical' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      : a.severity === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      : <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    <button className="min-w-0 flex-1 text-start" onClick={() => openAlert(a)}>
                      <p className="text-[13px] font-medium">{tr(a.title, a.titleAr)}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{tr(a.body, a.bodyAr)}</p>
                    </button>
                    <button
                      onClick={() => dismissAlert(a.id)}
                      className="rounded-md p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
                      title={tr('Hide this', 'إخفاء')}
                      aria-label={tr('Hide this', 'إخفاء')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Who is working */}
        <div className="relative ms-1" ref={userRef}>
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-accent/60"
          >
            <Initials name={me.name} />
            <div className="hidden text-start md:block">
              <p className="text-xs font-semibold leading-tight text-foreground">{me.name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel(me.role, lang)}</p>
            </div>
            <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
          </button>

          {userOpen && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-card-lg absolute end-0 top-12 z-50 w-72 overflow-hidden animate-slide-up-sm">
              <div className="border-b border-border/40 px-4 py-3">
                <p className="truncate text-[13px] font-semibold">{me.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{me.email} · {roleLabel(me.role, lang)}</p>
              </div>
              <div className="border-b border-border/40 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Repeat className="h-3 w-3" /> {tr('Work as someone else (demo)', 'اعمل كشخص آخر (تجربة)')}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tr('Two different people must say OK to money. Switch here to try it.', 'يجب أن يوافق شخصان مختلفان على المال. بدّل هنا لتجربة ذلك.')}
                </p>
                <div className="mt-2 space-y-1">
                  {users.filter((u) => u.active).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setActingAs(u.email); setUserOpen(false); }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[12px] transition-colors hover:bg-accent/60',
                        u.email === me.email && 'bg-primary/10',
                      )}
                    >
                      <Initials name={u.name} small />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{roleLabel(u.role, lang)}</span>
                      </span>
                      {u.email === me.email && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setUserOpen(false); navigate('/profile'); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent/50"
              >
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                {tr('My profile', 'ملفي')}
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 border-t border-border/40 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {tr('Sign out', 'تسجيل الخروج')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
