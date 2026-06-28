import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Mock data ───────────────────────────────────────────────────────────────
const mockExposure = [
  { symbol: 'EURUSD', book_type: 'B', open_positions: 142, lots_buy: 85.4, lots_sell: 62.1, net_lots: 23.3,  floating_pnl: -18420 },
  { symbol: 'XAUUSD', book_type: 'B', open_positions: 67,  lots_buy: 12.5, lots_sell: 18.2, net_lots: -5.7,  floating_pnl: 34800 },
  { symbol: 'USDJPY', book_type: 'B', open_positions: 89,  lots_buy: 45.0, lots_sell: 41.3, net_lots: 3.7,   floating_pnl: 5120 },
  { symbol: 'GBPUSD', book_type: 'B', open_positions: 53,  lots_buy: 22.1, lots_sell: 28.4, net_lots: -6.3,  floating_pnl: -9200 },
  { symbol: 'EURUSD', book_type: 'A', open_positions: 31,  lots_buy: 18.0, lots_sell: 14.5, net_lots: 3.5,   floating_pnl: -2100 },
  { symbol: 'BTCUSD', book_type: 'B', open_positions: 28,  lots_buy: 8.2,  lots_sell: 5.1,  net_lots: 3.1,   floating_pnl: 12600 },
];
const mockRiskAlerts = [
  { id: 'ra1', limit_type: 'MAX_EXPOSURE_PER_SYMBOL', symbol: 'XAUUSD', alert_type: 'WARNING', current_value: 780000,  limit_value: 1000000, percent_used: 78, is_resolved: false, created_at: '2026-06-28T08:15:00Z' },
  { id: 'ra2', limit_type: 'MAX_BBOOK_EXPOSURE',      symbol: null,      alert_type: 'WARNING', current_value: 4200000, limit_value: 5000000, percent_used: 84, is_resolved: false, created_at: '2026-06-28T09:30:00Z' },
];
const mockRiskLimits = [
  { id: 'rl1', limit_type: 'MAX_BBOOK_EXPOSURE',       symbol: null,     limit_value: 5000000, alert_at_percent: 80 },
  { id: 'rl2', limit_type: 'MAX_EXPOSURE_PER_SYMBOL',  symbol: 'XAUUSD', limit_value: 1000000, alert_at_percent: 75 },
  { id: 'rl3', limit_type: 'MAX_CLIENT_DRAWDOWN',      symbol: null,     limit_value: 500000,  alert_at_percent: 80 },
  { id: 'rl4', limit_type: 'MAX_DAILY_WITHDRAWAL',     symbol: null,     limit_value: 250000,  alert_at_percent: 90 },
];
const mockTopLossClients = [
  { id: 'c5',  full_name: 'Vladimir Petrov', client_code: 'CLI005', total_pnl: -42300, trade_count: 187 },
  { id: 'c8',  full_name: 'Park Ji-Ho',      client_code: 'CLI008', total_pnl: -28100, trade_count: 94 },
  { id: 'c12', full_name: 'Amr Khalil',      client_code: 'CLI012', total_pnl: -19800, trade_count: 213 },
  { id: 'c3',  full_name: 'Ali Hassan',      client_code: 'CLI003', total_pnl: -14500, trade_count: 67 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(n);
}

function fmtLots(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(1);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m ago` : `${m}m ago`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Risk() {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const totalFloating = mockExposure.reduce((s, e) => s + e.floating_pnl, 0);
  const openSymbols   = new Set(mockExposure.map((e) => e.symbol)).size;
  const bBookExp      = mockExposure
    .filter((e) => e.book_type === 'B')
    .reduce((s, e) => s + Math.abs(e.floating_pnl), 0);
  const activeAlerts  = mockRiskAlerts.filter((a) => !resolvedIds.has(a.id)).length;

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <PageHeader
        title="Risk Management"
        subtitle="Live exposure, B-Book monitoring, and risk alerts"
        hint={
          <PageHint id="risk" icon="⚠️" title="What is this page?">
            Monitor your firm's real-time B-Book and A-Book exposure by symbol, track
            open positions and floating P&amp;L, receive automated risk alerts when
            configured limits are approached, and review the top loss-generating clients.
          </PageHint>
        }
      />

      {/* ── Alert Banner ── */}
      {activeAlerts > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {activeAlerts} Active Risk Alert{activeAlerts > 1 ? 's' : ''} — XAUUSD and B-Book exposure approaching limits
            </p>
            <p className="mt-0.5 text-xs text-amber-700/70 dark:text-amber-300/60">
              Review and resolve open alerts to maintain compliance with configured risk limits
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-400/50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            View Alerts
          </Button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open Symbols"
          value={openSymbols}
          icon={Activity}
          accent="blue"
        />
        <StatCard
          label="Total Floating P/L"
          value={fmt(totalFloating)}
          icon={totalFloating >= 0 ? TrendingUp : TrendingDown}
          accent={totalFloating >= 0 ? 'green' : 'pink'}
        />
        <StatCard
          label="B-Book Exposure"
          value={fmt(bBookExp)}
          icon={Shield}
          accent="amber"
        />
        <StatCard
          label="Active Alerts"
          value={activeAlerts}
          icon={AlertTriangle}
          accent={activeAlerts > 0 ? 'pink' : 'green'}
        />
      </div>

      {/* ── Gradient Hero Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-800 p-6 shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Net Floating P/L — All Symbols</p>
            <p className={cn(
              'mt-1 text-4xl font-bold tracking-tight tabular-nums',
              totalFloating >= 0 ? 'text-emerald-300' : 'text-rose-300',
            )}>
              {totalFloating >= 0 ? '+' : ''}{fmt(totalFloating)}
            </p>
            <p className="mt-1.5 text-xs text-white/50">
              Across {mockExposure.reduce((s, e) => s + e.open_positions, 0)} open positions
              &nbsp;·&nbsp; {mockExposure.length} instrument rows
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-white/60">B-Book Exposure</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-amber-300">{fmt(bBookExp)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Open Alerts</p>
              <p className={cn(
                'mt-0.5 text-xl font-semibold tabular-nums',
                activeAlerts > 0 ? 'text-rose-300' : 'text-emerald-300',
              )}>{activeAlerts}</p>
            </div>
          </div>
        </div>
        {/* Decorative orbs */}
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 left-20 h-40 w-40 rounded-full bg-indigo-300/10 blur-3xl" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="exposure">
        <TabsList>
          <TabsTrigger value="exposure">Exposure</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            Alerts
            {activeAlerts > 0 && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {activeAlerts}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
        </TabsList>

        {/* ── Exposure Tab ── */}
        <TabsContent value="exposure" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Left — symbol exposure table */}
            <div className="lg:col-span-3">
              <SectionCard title="Open Exposure by Symbol" padded={false}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead className="text-right">Positions</TableHead>
                      <TableHead className="text-right">Buy Lots</TableHead>
                      <TableHead className="text-right">Sell Lots</TableHead>
                      <TableHead className="text-right">Net Lots</TableHead>
                      <TableHead className="text-right">Floating P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockExposure.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className="font-mono text-[13px] font-bold text-foreground">{row.symbol}</span>
                        </TableCell>
                        <TableCell>
                          {row.book_type === 'B' ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              B-Book
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              A-Book
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {row.open_positions}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {row.lots_buy.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {row.lots_sell.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={cn(
                            'font-semibold text-sm',
                            row.net_lots >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}>
                            {fmtLots(row.net_lots)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={cn(
                            'font-bold font-mono text-sm',
                            row.floating_pnl >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}>
                            {row.floating_pnl >= 0 ? '+' : ''}{fmt(row.floating_pnl)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </div>

            {/* Right — top loss clients */}
            <div className="lg:col-span-2">
              <SectionCard
                title="Top Loss Clients"
                description="Highest cumulative losses today"
                padded={false}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Trades</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTopLossClients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <p className="text-[13px] font-medium text-foreground">{c.full_name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{c.client_code}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {c.trade_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-bold font-mono text-sm text-rose-600 dark:text-rose-400">
                            {fmt(c.total_pnl)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Alerts Tab ── */}
        <TabsContent value="alerts" className="mt-4">
          <SectionCard
            title="Active Risk Alerts"
            description="Unresolved threshold breaches requiring attention"
          >
            <div className="space-y-4">
              {mockRiskAlerts.map((alert) => {
                const resolved = resolvedIds.has(alert.id);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all duration-200',
                      resolved
                        ? 'border-border/40 bg-background opacity-50'
                        : 'border-amber-400/30 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-950/20',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          resolved
                            ? 'bg-emerald-100 dark:bg-emerald-950/40'
                            : 'bg-amber-100 dark:bg-amber-950/40',
                        )}>
                          {resolved
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {alert.limit_type.replace(/_/g, ' ')}
                            </span>
                            {alert.symbol && (
                              <span className="font-mono text-xs text-muted-foreground">{alert.symbol}</span>
                            )}
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              resolved
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                            )}>
                              {resolved ? 'RESOLVED' : alert.alert_type}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {timeAgo(alert.created_at)} · Current:{' '}
                            <span className="font-mono font-medium text-foreground">{fmt(alert.current_value)}</span>
                            {' '}/ Limit:{' '}
                            <span className="font-mono font-medium text-foreground">{fmt(alert.limit_value)}</span>
                          </p>
                          {/* Progress bar */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  alert.percent_used >= 90
                                    ? 'bg-rose-500'
                                    : alert.percent_used >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500',
                                )}
                                style={{ width: `${alert.percent_used}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {alert.percent_used}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {!resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() =>
                            setResolvedIds((prev) => new Set([...prev, alert.id]))
                          }
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {mockRiskAlerts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No active alerts</p>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Limits Tab ── */}
        <TabsContent value="limits" className="mt-4">
          <SectionCard
            title="Configured Risk Limits"
            description="Thresholds that trigger automated alerts"
            padded={false}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Limit Type</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Limit Value</TableHead>
                  <TableHead className="text-right">Alert Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRiskLimits.map((lim) => (
                  <TableRow key={lim.id}>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {lim.limit_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lim.symbol ? (
                        <span className="font-mono text-xs font-semibold text-foreground">{lim.symbol}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">All</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {fmt(lim.limit_value)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {lim.alert_at_percent}%
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
