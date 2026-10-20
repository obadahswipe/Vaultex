import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Inbox, Users, BarChart3, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { NAV } from './nav';

const tabs = [
  { to: '/',           icon: LayoutGrid, en: 'Home',     ar: 'الرئيسية', end: true },
  { to: '/operations', icon: Inbox,      en: 'Requests', ar: 'الطلبات', badge: true },
  { to: '/clients',    icon: Users,      en: 'Clients',  ar: 'الزبائن' },
  { to: '/reports',    icon: BarChart3,  en: 'Reports',  ar: 'التقارير' },
];

/** Phone navigation: four main pages plus a "Menu" button that shows everything. */
export function BottomNav() {
  const pendingCount = useBooks((s) => s.requests.filter((r) => r.status === 'pending').length);
  const { tr } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const tabClass = (isActive: boolean) => cn(
    'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1',
    'text-xs font-medium rounded-xl mx-0.5 transition-colors duration-150',
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
  );

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background md:hidden">
          <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
            <p className="text-base font-bold">{tr('All pages', 'كل الصفحات')}</p>
            <button onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-muted" aria-label={tr('Close', 'إغلاق')}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-24">
            {NAV.map((section) => (
              <div key={section.id}>
                {section.en && <p className="pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{tr(section.en, section.ar)}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border p-3 text-[13px] font-medium',
                          active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-card',
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="leading-tight">{tr(item.en, item.ar)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav
        className={cn(
          'fixed bottom-0 inset-x-0 z-50 md:hidden',
          'border-t border-border bg-card/95 backdrop-blur-md',
          'supports-[backdrop-filter]:bg-card/80',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around h-16 px-1">
          {tabs.map(({ to, icon: Icon, en, ar, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <div className={cn('relative flex items-center justify-center h-8 w-8 rounded-xl transition-colors duration-150', isActive && 'bg-primary/10')}>
                    <Icon className="h-5 w-5" />
                    {badge && pendingCount > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <span className={cn('text-[10px] leading-none transition-colors', isActive && 'font-semibold')}>{tr(en, ar)}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMenuOpen(true)} className={tabClass(false)}>
            <div className="flex items-center justify-center h-8 w-8 rounded-xl"><Menu className="h-5 w-5" /></div>
            <span className="text-[10px] leading-none">{tr('Menu', 'القائمة')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
