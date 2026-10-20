import { NavLink } from 'react-router-dom';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/hooks/use-toast';
import { NAV, type NavItem } from './nav';

function usePendingCount() {
  return useBooks((s) => s.requests.filter((r) => r.status === 'pending').length);
}

function LeafLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const { tr } = useTranslation();
  const pending = usePendingCount();
  const badge = item.badge === 'pendingRequests' && pending > 0 ? pending : null;
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={`${tr(item.en, item.ar)} — ${tr(item.helpEn, item.helpAr)}`}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
          !expanded && 'justify-center px-2',
          isActive
            ? 'bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/10 text-white font-semibold'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.6)]" />
          )}
          <Icon className="h-[15px] w-[15px] shrink-0" />
          {expanded && <span className="flex-1 truncate">{tr(item.en, item.ar)}</span>}
          {badge != null && (
            <span className={cn(
              'grid min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white',
              !expanded && 'absolute -top-0.5 end-0.5 h-4',
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { t, tr } = useTranslation();
  const brokerName = useBooks((s) => s.general.brokerName);
  const resetDemo = useBooks((s) => s.resetDemo);

  const onReset = () => {
    if (!window.confirm(tr('Start the demo again with fresh sample data? Your changes will be removed.', 'هل تريد بدء النسخة التجريبية من جديد ببيانات جديدة؟ ستُحذف تغييراتك.'))) return;
    resetDemo();
    toast({ title: tr('Fresh sample data is ready.', 'البيانات التجريبية الجديدة جاهزة.') });
  };

  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-e border-sidebar-border text-sidebar-foreground md:flex',
        'transition-[width] duration-300 ease-spring',
        'bg-[hsl(var(--sidebar-background))]',
        sidebarOpen ? 'w-60' : 'w-[68px]',
      )}
      style={{ boxShadow: '4px 0 24px -8px rgba(0,0,0,0.25)' }}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-bg glow-primary">
          <span className="text-[13px] font-bold tracking-tight text-white">FX</span>
        </div>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold leading-tight text-sidebar-foreground tracking-tight">{t('app.name')}</p>
            <p className="truncate text-[11px] leading-tight text-sidebar-foreground/50">{brokerName}</p>
          </div>
        )}
      </div>

      {/* Toggle button (floating pill at edge) */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute -end-3 top-[72px] z-10',
          'flex h-6 w-6 items-center justify-center rounded-full',
          'bg-[hsl(var(--sidebar-background))] border border-sidebar-border text-sidebar-foreground/50',
          'shadow-shadow-2 hover:text-sidebar-foreground transition-colors duration-150',
        )}
        aria-label={tr('Show or hide the menu', 'إظهار القائمة أو إخفاؤها')}
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform duration-300 rtl:rotate-180', !sidebarOpen && 'rotate-180 rtl:rotate-0')} />
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {NAV.map((section) => (
          <div key={section.id}>
            {sidebarOpen && section.en && (
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                {tr(section.en, section.ar)}
              </p>
            )}
            {!sidebarOpen && section.en && <div className="mx-3 mb-2 border-t border-sidebar-border" />}
            <div className="space-y-0.5">
              {section.items.map((item) => <LeafLink key={item.to} item={item} expanded={sidebarOpen} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Demo footer */}
      {sidebarOpen && (
        <div className="m-3 mt-0 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          <p className="text-[11px] font-semibold text-sidebar-foreground/80">{tr('You are using sample data', 'أنت تستخدم بيانات تجريبية')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-sidebar-foreground/50">{tr('Click around freely. Nothing here is real.', 'جرّب كل شيء بحرية. لا شيء هنا حقيقي.')}</p>
          <button
            onClick={onReset}
            className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[11px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/20"
          >
            <RotateCcw className="h-3 w-3" />
            {tr('Start fresh', 'ابدأ من جديد')}
          </button>
        </div>
      )}
    </aside>
  );
}
