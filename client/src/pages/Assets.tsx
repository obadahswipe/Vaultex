import { useState } from 'react';
import { Package, DollarSign, TrendingDown, BarChart2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAssets, mockAssetCategories } from '@/mocks/data/assets.mock';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'DISPOSED', 'UNDER_REPAIR'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function AssetStatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        Active
      </span>
    );
  }
  if (status === 'DISPOSED') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
        Disposed
      </span>
    );
  }
  if (status === 'UNDER_REPAIR') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Under Repair
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function NbvCell({ nbv }: { nbv: number }) {
  if (nbv === 0) {
    return (
      <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
        Fully Depreciated
      </span>
    );
  }
  return (
    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
      ${nbv.toLocaleString()}
    </span>
  );
}

export default function Assets() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const filtered = statusFilter === 'ALL'
    ? mockAssets
    : mockAssets.filter(a => a.status === statusFilter);

  const activeAssets     = mockAssets.filter(a => a.status === 'ACTIVE');
  const totalCost        = mockAssets.reduce((s, a) => s + a.purchase_cost, 0);
  const totalAccumDepr   = mockAssets.reduce((s, a) => s + (a.accumulated_depreciation ?? 0), 0);
  const totalNBV         = mockAssets.reduce((s, a) => s + (a.net_book_value ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fixed Assets"
        subtitle="Asset register, depreciation schedules, and category management"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        }
      />

      <PageHint id="assets" icon="🏗️" title="Fixed Assets Module">
        Track all fixed assets, their depreciation schedules (straight-line or declining-balance), and net book value.
        Disposed assets are retained for historical reference.
      </PageHint>

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-80 mb-1">Net Book Value</p>
          <p className="text-4xl font-bold tracking-tight">${totalNBV.toLocaleString()}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              Original Cost ${totalCost.toLocaleString()}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              Accum. Depreciation ${totalAccumDepr.toLocaleString()}
            </span>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active Assets"
          value={activeAssets.length}
          icon={Package}
          accent="blue"
          deltaLabel="in service"
        />
        <StatCard
          label="Total Cost"
          value={`$${totalCost.toLocaleString()}`}
          icon={DollarSign}
          accent="green"
          deltaLabel="original purchase cost"
        />
        <StatCard
          label="Accum. Depreciation"
          value={`$${totalAccumDepr.toLocaleString()}`}
          icon={TrendingDown}
          accent="pink"
          deltaLabel="total written down"
        />
        <StatCard
          label="Net Book Value"
          value={`$${totalNBV.toLocaleString()}`}
          icon={BarChart2}
          accent="violet"
          deltaLabel="carrying value"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* ── Asset Register tab ── */}
        <TabsContent value="register" className="mt-4 space-y-4">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <SectionCard
            title={statusFilter === 'ALL' ? 'All Assets' : `${statusFilter.replace(/_/g, ' ')} Assets`}
            description={`Showing ${filtered.length} of ${mockAssets.length} assets`}
            padded={false}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Accum. Depr.</TableHead>
                  <TableHead className="text-right">NBV</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{asset.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{asset.asset_code}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.category_name}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.branch_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{asset.purchase_date}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-foreground">
                        ${asset.purchase_cost.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-red-600 dark:text-red-400">
                        ${asset.accumulated_depreciation.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <NbvCell nbv={asset.net_book_value} />
                    </TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ── Categories tab ── */}
        <TabsContent value="categories" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockAssetCategories.map(cat => (
              <div key={cat.id} className="card-elevated flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold text-foreground">{cat.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cat.depreciation_method.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Useful life: {cat.useful_life_years} years
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <TrendingDown className="h-5 w-5 text-violet-500" />
                </div>
              </div>
            ))}

            {/* Add category placeholder */}
            <button className="flex min-h-[84px] items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add Category</span>
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
