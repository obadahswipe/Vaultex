import { useState, useMemo, type ReactElement } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  ListTree,
  BookOpen,
  Database,
  Wallet,
  Receipt,
  Coins,
  Users,
  CreditCard,
  TrendingUp,
  GitBranch,
  Clock,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FolderKanban,
  ShieldCheck,
  Sliders,
  Tags,
  Plug,
  Inbox,
  BarChart2,
  Scale,
  Building2,
  AlertOctagon,
  // New modules
  MapPin,
  WalletCards,
  MessageSquare,
  UserCheck,
  Package,
  Crown,
  ShieldAlert,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TranslationKey } from '@/lib/i18n/translations';

type Icon = typeof LayoutGrid;
type NavLeaf  = { to: string; labelKey: TranslationKey; icon: Icon };
type NavGroup = { key: string; labelKey: TranslationKey; icon: Icon; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return 'children' in e;
}

const PLAIN_LABELS: Partial<Record<string, string>> = {
  '/':                  'Dashboard — your financial overview at a glance',
  '/entries':           'Entries — individual debit/credit records',
  '/report':            'Report — account balances by category',
  '/data':              'Data — raw workbook data',
  '/opening':           'Opening — starting balances',
  '/vouchers':          'Vouchers — numbered payment receipts',
  '/currency':          'Currency — exchange rates and alerts',
  '/operations':        'Operations — pending client requests to approve',
  '/clients':           'Clients — your client accounts and balances',
  '/ib-mgmt':           'IB Management — introducing broker partners',
  '/payments':          'Payments — all money in and out',
  '/trades':            'Trades — client buy/sell positions',
  '/journals':          'Journals — official double-entry transaction records',
  '/reports':           'Reports — P&L, Balance Sheet, Trial Balance',
  '/ib-commissions':    'IB Commissions — partner earnings',
  '/reconciliation':    'Reconciliation — match internal vs external records',
  '/treasury':          'Treasury — cash and liquidity overview',
  '/aging':             'Aging Report — overdue balances by age',
  '/ops-analytics':     'Analytics — charts and operational trends',
  '/eod':               "End of Day — close and lock today's records",
  '/chart-of-accounts': 'Chart of Accounts — master account list',
  '/users':             'Users — manage staff accounts',
  '/settings/general':  'General Settings — broker config and period locking',
  '/settings/symbols':  'Symbols — trading instrument settings',
  '/settings/gateways': 'Gateways — payment gateway configuration',
  '/settings/operations': 'Operations Settings — workflow configuration',
  '/profile':           'My Profile — your account details',
  '/branches':          'Branches & Departments — org structure',
  '/wallets':           'Wallets — client wallet balances',
  '/crm':               'CRM — leads, activities, tickets',
  '/hr':                'HR — employees, leave, payroll',
  '/assets':            'Fixed Assets — register and depreciation',
  '/ownership':         'Ownership — shareholders and capital',
  '/risk':              'Risk — live exposure and alerts',
  '/workflows':         'Workflows — approval queues and templates',
};

const navigation: { titleKey: TranslationKey; entries: NavEntry[] }[] = [
  {
    titleKey: 'sidebar.workbook',
    entries: [
      { to: '/', labelKey: 'sheet.equity', icon: LayoutGrid },
      {
        key: 'sheets',
        labelKey: 'sidebar.sheets',
        icon: FolderKanban,
        children: [
          { to: '/entries',  labelKey: 'sheet.entries',  icon: ListTree },
          { to: '/report',   labelKey: 'sheet.report',   icon: BookOpen },
          { to: '/data',     labelKey: 'sheet.data',     icon: Database },
          { to: '/opening',  labelKey: 'sheet.opening',  icon: Wallet },
          { to: '/vouchers', labelKey: 'sheet.vouchers', icon: Receipt },
          { to: '/currency', labelKey: 'sheet.currency', icon: Coins },
        ],
      },
    ],
  },
  {
    titleKey: 'sidebar.operations',
    entries: [
      { to: '/operations', labelKey: 'ops.requests', icon: Inbox },
      {
        key: 'records',
        labelKey: 'sidebar.records',
        icon: BookOpen,
        children: [
          { to: '/clients',  labelKey: 'ops.clients',    icon: Users },
          { to: '/ib-mgmt',  labelKey: 'sidebar.ibMgmt', icon: GitBranch },
          { to: '/payments', labelKey: 'ops.payments',   icon: CreditCard },
          { to: '/trades',   labelKey: 'ops.trades',     icon: TrendingUp },
          { to: '/journals', labelKey: 'ops.journals',   icon: ListTree },
        ],
      },
      {
        key: 'reporting',
        labelKey: 'sidebar.reporting',
        icon: TrendingUp,
        children: [
          { to: '/reports',           labelKey: 'ops.reports',            icon: BookOpen },
          { to: '/ib-commissions',    labelKey: 'ops.ib',                 icon: GitBranch },
          { to: '/reconciliation',    labelKey: 'sidebar.reconciliation', icon: Scale },
          { to: '/treasury',          labelKey: 'sidebar.treasury',       icon: Building2 },
          { to: '/aging',             labelKey: 'sidebar.aging',          icon: Clock },
          { to: '/ops-analytics',     labelKey: 'sidebar.opsAnalytics',   icon: BarChart2 },
          { to: '/eod',               labelKey: 'ops.eod',                icon: AlertOctagon },
          { to: '/chart-of-accounts', labelKey: 'ops.coa',                icon: Database },
        ],
      },
    ],
  },
  {
    titleKey: 'sidebar.platform',
    entries: [
      { to: '/branches',  labelKey: 'sidebar.branches',  icon: MapPin },
      { to: '/wallets',   labelKey: 'sidebar.wallets',   icon: WalletCards },
      { to: '/crm',       labelKey: 'sidebar.crm',       icon: MessageSquare },
      { to: '/hr',        labelKey: 'sidebar.hr',        icon: UserCheck },
      { to: '/assets',    labelKey: 'sidebar.assets',    icon: Package },
      { to: '/ownership', labelKey: 'sidebar.ownership', icon: Crown },
      { to: '/risk',      labelKey: 'sidebar.risk',      icon: ShieldAlert },
      { to: '/workflows', labelKey: 'sidebar.workflows', icon: Workflow },
    ],
  },
  {
    titleKey: 'sidebar.admin',
    entries: [
      { to: '/users', labelKey: 'ops.users', icon: UserCog },
      {
        key: 'settings',
        labelKey: 'sidebar.settings',
        icon: Settings,
        children: [
          { to: '/settings/general',    labelKey: 'sidebar.general',     icon: Sliders },
          { to: '/settings/symbols',    labelKey: 'sidebar.symbols',     icon: Tags },
          { to: '/settings/gateways',   labelKey: 'sidebar.gateways',    icon: Plug },
          { to: '/settings/operations', labelKey: 'sidebar.opsSettings', icon: Inbox },
        ],
      },
      { to: '/profile', labelKey: 'ops.myProfile', icon: ShieldCheck },
    ],
  },
];

function ItemIcon({ Icon }: { Icon: Icon }) {
  return <Icon className="h-[15px] w-[15px] shrink-0" />;
}

function LeafLink({
  to, labelKey, icon: Icon, expanded, nested,
}: NavLeaf & { expanded: boolean; nested?: boolean }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={PLAIN_LABELS[to] ?? t(labelKey)}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
          nested && expanded && 'ms-3 py-1.5 text-[13px]',
          isActive
            ? 'bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/10 text-white font-semibold'
            : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !nested && (
            <span className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-sidebar-primary shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.6)]" />
          )}
          <ItemIcon Icon={Icon} />
          {expanded && <span className="truncate">{t(labelKey)}</span>}
        </>
      )}
    </NavLink>
  );
}

function GroupItem({
  group, expanded, autoOpen,
}: { group: NavGroup; expanded: boolean; autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const { t } = useTranslation();
  const childCount = group.children.length;

  if (!expanded) {
    return (
      <div className="relative">
        <NavLink
          to={group.children[0].to}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center justify-center rounded-xl p-2 transition-all duration-150',
              isActive
                ? 'bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/10 text-white'
                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )
          }
          title={t(group.labelKey)}
        >
          <ItemIcon Icon={group.icon} />
        </NavLink>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
          'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
        aria-expanded={open}
      >
        <ItemIcon Icon={group.icon} />
        <span className="flex-1 text-start">{t(group.labelKey)}</span>
        <span className="rounded-full bg-sidebar-accent/80 px-1.5 text-[10px] font-bold text-sidebar-foreground/50">
          {childCount}
        </span>
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200 rtl:rotate-180', open && 'rotate-90 rtl:-rotate-90')} />
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 border-s-2 border-sidebar-foreground/10 ps-2 animate-slide-up-sm">
          {group.children.map((child) => (
            <LeafLink key={child.to} {...child} expanded nested />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { t } = useTranslation();
  const location = useLocation();

  const activeGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const section of navigation) {
      for (const entry of section.entries) {
        if (isGroup(entry) && entry.children.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))) {
          groups.add(entry.key);
        }
      }
    }
    return groups;
  }, [location.pathname]);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-e border-sidebar-border text-sidebar-foreground',
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
            <p className="truncate text-[13px] font-bold leading-tight text-sidebar-foreground tracking-tight">
              {t('app.name')}
            </p>
            <p className="truncate text-[11px] leading-tight text-sidebar-foreground/45">
              {t('app.workbookAdmin')}
            </p>
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
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform duration-300 rtl:rotate-180', !sidebarOpen && 'rotate-180 rtl:rotate-0')} />
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {navigation.map((section) => (
          <div key={section.titleKey}>
            {sidebarOpen && (
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/35">
                {t(section.titleKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.entries.map((entry): ReactElement =>
                isGroup(entry) ? (
                  <GroupItem
                    key={entry.key}
                    group={entry}
                    expanded={sidebarOpen}
                    autoOpen={activeGroups.has(entry.key)}
                  />
                ) : (
                  <LeafLink key={entry.to} {...entry} expanded={sidebarOpen} />
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* AI footer card */}
      {sidebarOpen && (
        <div
          className="m-3 mt-0 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-violet-600 p-4 text-white"
          style={{ boxShadow: '0 4px 24px -4px hsl(var(--sidebar-primary)/0.4)' }}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <p className="text-[11px] font-semibold uppercase tracking-wider">{t('sidebar.aiTitle')}</p>
          </div>
          <p className="mt-1.5 text-xs leading-snug opacity-85">
            {t('sidebar.aiBody')}
          </p>
          <button className="mt-3 inline-flex h-7 items-center rounded-lg bg-white/25 px-2.5 text-[11px] font-semibold backdrop-blur hover:bg-white/35 transition-colors">
            {t('sidebar.aiCta')}
          </button>
        </div>
      )}
    </aside>
  );
}
