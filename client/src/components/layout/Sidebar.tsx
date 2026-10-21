import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, RotateCcw, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/hooks/use-toast';
import { NAV, findNavItem, type NavItem, type NavSection } from './nav';

function usePendingCount() {
  return useBooks((s) => s.requests.filter((r) => r.status === 'pending').length);
}

function LeafLink({ item, expanded, nested = false }: { item: NavItem; expanded: boolean; nested?: boolean }) {
  const { tr } = useTranslation();
  const pending = usePendingCount();
  const badge = item.badge === 'pendingRequests' && pending > 0 ? pending : null;
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={`${tr(item.en, item.ar)} · ${tr(item.helpEn, item.helpAr)}`}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-150',
          !expanded && 'justify-center px-0',
          isActive
            ? 'bg-white/[0.08] font-semibold text-white'
            : 'text-sidebar-foreground/65 hover:bg-white/[0.04] hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && nested && expanded && (
            <span className="absolute -start-[13px] top-1.5 bottom-1.5 w-[2px] rounded-full bg-sidebar-primary" />
          )}
          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80')} />
          {expanded && <span className="flex-1 truncate">{tr(item.en, item.ar)}</span>}
          {badge != null && (
            <span className={cn(
              'grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white',
              !expanded && 'absolute end-1.5 top-0.5 h-4 min-w-4',
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function Group({ section, activeHere }: { section: NavSection; activeHere: boolean }) {
  const { tr } = useTranslation();
  const closed = useUIStore((s) => s.closedSections.includes(section.id));
  const toggleSection = useUIStore((s) => s.toggleSection);
  const pending = usePendingCount();
  const open = !closed;
  const badge = section.items.some((i) => i.badge === 'pendingRequests') && pending > 0 ? pending : null;
  const panelId = `nav-${section.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleSection(section.id)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'group flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] transition-colors',
          activeHere && !open ? 'text-sidebar-foreground' : 'text-sidebar-foreground/45 hover:text-sidebar-foreground/80',
        )}
      >
        <span className="flex-1 truncate text-start">{tr(section.en, section.ar)}</span>
        {!open && activeHere && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" aria-hidden />}
        {!open && badge != null && (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold normal-case tracking-normal text-white">{badge}</span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', !open && '-rotate-90 rtl:rotate-90')} />
      </button>
      <div
        id={panelId}
        className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
      >
        <div className="overflow-hidden">
          <div className="ms-[18px] mt-0.5 mb-1 space-y-0.5 border-s border-white/[0.07] ps-3" inert={!open || undefined}>
            {section.items.map((item) => <LeafLink key={item.to} item={item} expanded nested />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, closedSections, openSection } = useUIStore();
  const { t, tr } = useTranslation();
  const location = useLocation();
  const brokerName = useBooks((s) => s.general.brokerName);
  const resetDemo = useBooks((s) => s.resetDemo);

  // The group holding the page you are on opens by itself.
  const current = findNavItem(location.pathname);
  const activeSection = NAV.find((s) => s.items.some((i) => i === current))?.id;
  useEffect(() => { if (activeSection) openSection(activeSection); }, [activeSection, openSection]);

  const groups = NAV.filter((s) => s.en);
  const top = NAV.filter((s) => !s.en).flatMap((s) => s.items);
  const allClosed = groups.filter((g) => g.id !== activeSection).every((g) => closedSections.includes(g.id));
  const setAll = (close: boolean) =>
    useUIStore.setState({ closedSections: close ? groups.map((g) => g.id).filter((id) => id !== activeSection) : [] });

  const onReset = () => {
    if (!window.confirm(tr('Start the demo again with fresh sample data? Your changes will be removed.', 'هل تريد بدء النسخة التجريبية من جديد ببيانات جديدة؟ ستُحذف تغييراتك.'))) return;
    resetDemo();
    toast({ title: tr('Fresh sample data is ready.', 'البيانات التجريبية الجديدة جاهزة.') });
  };

  return (
    <aside
      className={cn(
        'relative hidden h-full shrink-0 flex-col border-e border-white/[0.06] bg-[hsl(var(--sidebar-background))] text-sidebar-foreground md:flex',
        'transition-[width] duration-300 ease-spring',
        sidebarOpen ? 'w-64' : 'w-[68px]',
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-16 shrink-0 items-center gap-2.5 px-3', !sidebarOpen && 'justify-center px-0')}>
        <button
          type="button"
          onClick={sidebarOpen ? undefined : toggleSidebar}
          className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-bg', !sidebarOpen && 'cursor-pointer')}
          aria-label={sidebarOpen ? t('app.name') : tr('Show the menu', 'أظهر القائمة')}
          tabIndex={sidebarOpen ? -1 : 0}
        >
          <span className="text-[13px] font-bold tracking-tight text-white">FX</span>
        </button>
        {sidebarOpen && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight tracking-tight text-white">{t('app.name')}</p>
              <p className="truncate text-[11px] leading-tight text-sidebar-foreground/45">{brokerName}</p>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/45 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground"
              aria-label={tr('Make the menu smaller', 'صغّر القائمة')}
              title={tr('Make the menu smaller', 'صغّر القائمة')}
            >
              <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-4 [scrollbar-width:thin]" aria-label={tr('Main menu', 'القائمة الرئيسية')}>
        {sidebarOpen ? (
          <div className="space-y-1">
            <div className="space-y-0.5 pb-2">
              {top.map((item) => <LeafLink key={item.to} item={item} expanded />)}
            </div>
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[10.5px] font-medium text-sidebar-foreground/30">{tr('Menu', 'القائمة')}</span>
              <button
                type="button"
                onClick={() => setAll(!allClosed)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-sidebar-foreground/40 transition-colors hover:bg-white/[0.05] hover:text-sidebar-foreground/80"
              >
                {allClosed ? <ChevronsUpDown className="h-3 w-3" /> : <ChevronsDownUp className="h-3 w-3" />}
                {allClosed ? tr('Open all', 'افتح الكل') : tr('Fold all', 'اطوِ الكل')}
              </button>
            </div>
            {groups.map((section) => (
              <Group key={section.id} section={section} activeHere={section.id === activeSection} />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {NAV.map((section, i) => (
              <div key={section.id} className="space-y-0.5">
                {i > 0 && <div className="mx-auto my-2 h-px w-6 bg-white/[0.08]" />}
                {section.items.map((item) => <LeafLink key={item.to} item={item} expanded={false} />)}
              </div>
            ))}
            <button
              type="button"
              onClick={toggleSidebar}
              className="mt-3 grid h-9 w-full place-items-center rounded-lg text-sidebar-foreground/45 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground"
              aria-label={tr('Show the menu', 'أظهر القائمة')}
              title={tr('Show the menu', 'أظهر القائمة')}
            >
              <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        )}
      </nav>

      {/* Demo footer */}
      {sidebarOpen && (
        <div className="m-3 mt-0 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold text-sidebar-foreground/85">{tr('Sample data', 'بيانات تجريبية')}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/45">{tr('Nothing here is real.', 'لا شيء هنا حقيقي.')}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 text-[11px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/[0.14]"
            title={tr('Start fresh', 'ابدأ من جديد')}
          >
            <RotateCcw className="h-3 w-3" />
            {tr('Reset', 'إعادة')}
          </button>
        </div>
      )}
    </aside>
  );
}
