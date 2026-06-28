import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Crown, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockShareholders, mockCapitalContributions, mockDistributions } from '@/mocks/data/ownership.mock';
import { cn } from '@/lib/utils';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function ShareholderAvatar({ name, index }: { name: string; index: number }) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
    >
      {name.charAt(0)}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === 'COMPANY') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Company
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
      Individual
    </span>
  );
}

function ShareClassBadge({ cls }: { cls: string }) {
  if (cls === 'PREFERRED') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
        Preferred
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
      Ordinary
    </span>
  );
}

function ContributionTypeBadge({ type }: { type: string }) {
  if (type === 'INITIAL_CAPITAL') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Initial Capital
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      Additional Capital
    </span>
  );
}

function DistributionStatusBadge({ status }: { status: string }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        Paid
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
      Draft
    </span>
  );
}

export default function Ownership() {
  const totalCapital     = mockCapitalContributions.reduce((s, c) => s + c.amount_usd, 0);
  const totalDistributed = mockDistributions.reduce((s, d) => s + d.distributable_amount, 0);

  const pieData = mockShareholders.map(sh => ({
    name: sh.full_name,
    value: sh.ownership_percent,
  }));

  // Last distribution summary for hero
  const lastDist = mockDistributions[0];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ownership & Shareholders"
        subtitle="Shareholder registry, capital contributions, and profit distributions"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Shareholder
          </Button>
        }
      />

      <PageHint id="ownership" icon="👑" title="Ownership Module">
        Manage shareholder records, track capital contributions, and record profit distributions.
        All amounts are in USD. The pie chart reflects current equity ownership percentages.
      </PageHint>

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-80 mb-1">Total Paid-In Capital</p>
          <p className="text-4xl font-bold tracking-tight">${totalCapital.toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              {mockShareholders.length} Shareholders
            </span>
            {lastDist && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                Last Distribution: $900K (2025)
              </span>
            )}
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Shareholders"
          value={mockShareholders.length}
          icon={Crown}
          accent="blue"
          deltaLabel="registered shareholders"
        />
        <StatCard
          label="Total Capital"
          value={`$${totalCapital.toLocaleString()}`}
          icon={DollarSign}
          accent="green"
          deltaLabel="paid-in capital (USD)"
        />
        <StatCard
          label="Distributed All Time"
          value={`$${totalDistributed.toLocaleString()}`}
          icon={TrendingUp}
          accent="violet"
          deltaLabel="total profit distributed"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shareholders">
        <TabsList>
          <TabsTrigger value="shareholders">Shareholders</TabsTrigger>
          <TabsTrigger value="capital">Capital</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
        </TabsList>

        {/* ── Shareholders tab ── */}
        <TabsContent value="shareholders" className="mt-4">
          <div className="grid grid-cols-5 gap-6">
            {/* Left: Pie chart */}
            <div className="col-span-5 lg:col-span-2">
              <SectionCard title="Ownership Structure" description="Equity split by shareholder">
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, 'Ownership']}
                        contentStyle={{
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="mt-2 w-full space-y-2">
                    {mockShareholders.map((sh, i) => (
                      <div key={sh.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-foreground">{sh.full_name}</span>
                        </div>
                        <span className="font-bold text-foreground">{sh.ownership_percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Right: Table */}
            <div className="col-span-5 lg:col-span-3">
              <SectionCard
                title="Shareholder Registry"
                description="All registered shareholders and their equity stakes"
                padded={false}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shareholder</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Share Class</TableHead>
                      <TableHead className="text-right">Ownership</TableHead>
                      <TableHead className="text-right">Contributed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockShareholders.map((sh, i) => (
                      <TableRow key={sh.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ShareholderAvatar name={sh.full_name} index={i} />
                            <div>
                              <p className="font-medium text-foreground">{sh.full_name}</p>
                              {(sh as typeof sh & { company_name?: string }).company_name && (
                                <p className="text-xs text-muted-foreground">
                                  {(sh as typeof sh & { company_name?: string }).company_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{sh.nationality}</TableCell>
                        <TableCell>
                          <TypeBadge type={sh.shareholder_type} />
                        </TableCell>
                        <TableCell>
                          <ShareClassBadge cls={sh.share_class} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className="font-bold text-base"
                            style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}
                          >
                            {sh.ownership_percent}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm font-medium text-foreground">
                            ${sh.total_contributed_usd.toLocaleString()}
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

        {/* ── Capital tab ── */}
        <TabsContent value="capital" className="mt-4">
          <SectionCard
            title="Capital Contributions"
            description="All capital injections from shareholders"
            padded={false}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shareholder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">USD Equiv.</TableHead>
                  <TableHead>Bank Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCapitalContributions.map(cc => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-medium text-foreground">{cc.shareholder_name}</TableCell>
                    <TableCell>
                      <ContributionTypeBadge type={cc.contribution_type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{cc.contribution_date}</TableCell>
                    <TableCell className="text-muted-foreground">{cc.currency}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-foreground">
                        {cc.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold text-foreground">
                        ${cc.amount_usd.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{cc.bank_reference}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Total footer row */}
            <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
              <span className="text-sm font-semibold text-foreground">Total Capital</span>
              <span className="font-mono text-base font-bold text-foreground">
                ${totalCapital.toLocaleString()}
              </span>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── Distributions tab ── */}
        <TabsContent value="distributions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Distribution
            </Button>
          </div>

          {mockDistributions.map(dist => (
            <SectionCard key={dist.id} padded={false}>
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-border/40">
                <div>
                  <p className="font-semibold text-foreground">
                    {dist.period_start} → {dist.period_end}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Distribution date: {dist.distribution_date}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Profit</p>
                    <p className="mt-0.5 font-bold font-mono text-foreground">
                      ${dist.total_profit.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Distributed</p>
                    <p className="mt-0.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ${dist.distributable_amount.toLocaleString()}
                    </p>
                  </div>
                  <DistributionStatusBadge status={dist.status} />
                </div>
              </div>

              {/* Breakdown grid */}
              <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
                {dist.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      >
                        {item.shareholder.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.shareholder}</p>
                        <p className="text-xs text-muted-foreground">{item.percent}% equity</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ${item.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
