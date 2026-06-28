import { useState } from 'react';
import { Wallet, Clock, Users, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockWallets, mockWalletTransactions } from '@/mocks/data/wallets.mock';
import { cn } from '@/lib/utils';

export default function Wallets() {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const totalBalance = mockWallets.reduce((s, w) => s + (w.currency === 'USD' ? w.balance : 0), 0);
  const totalPending = mockWallets.reduce((s, w) => s + w.pending_balance, 0);
  const activeCount = mockWallets.filter((w) => w.is_active).length;

  const txs = selectedWallet
    ? mockWalletTransactions.filter((t) => t.wallet_id === selectedWallet)
    : mockWalletTransactions;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Wallets"
        subtitle="Wallet balances, transactions, and funding overview across all clients"
        hint={
          <PageHint id="wallets" icon="💳" title="What is this page?">
            This page shows each client's wallet balance and recent transaction history. Click a
            wallet on the left to filter transactions for that specific wallet, or view all
            transactions at once.
          </PageHint>
        }
      />

      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70">Total Holdings</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
            ${totalBalance.toLocaleString()}
          </h2>
          <p className="mt-1 text-sm text-white/60">Across all active wallets</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Wallet className="h-3.5 w-3.5" /> Active Wallets: {activeCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5" /> Pending: ${totalPending.toLocaleString()}
            </span>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Balance"
          value={`$${totalBalance.toLocaleString()}`}
          icon={Wallet}
          accent="blue"
        />
        <StatCard
          label="Pending Withdrawals"
          value={`$${totalPending.toLocaleString()}`}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="Active Wallets"
          value={activeCount}
          icon={Users}
          accent="green"
        />
      </div>

      {/* 2-column layout */}
      <div className="grid gap-6 grid-cols-5">
        {/* Wallet list */}
        <div className="col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-3">
            Client Wallets
          </p>
          {mockWallets.map((w) => {
            const isSelected = selectedWallet === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWallet(isSelected ? null : w.id)}
                className={cn(
                  'w-full text-left rounded-2xl border p-4 transition-all',
                  isSelected
                    ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                    : 'border-border bg-card hover:border-border/80 hover:bg-accent/30',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{w.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.client_code} · {w.currency}</p>
                  </div>
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary/20' : 'bg-primary/10',
                  )}>
                    <Wallet className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-primary')} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {w.currency} {w.balance.toLocaleString()}
                  </p>
                  {w.pending_balance > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                      <Clock className="h-3 w-3" />
                      {w.currency} {w.pending_balance.toLocaleString()} pending
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Transactions */}
        <div className="col-span-3">
          <SectionCard
            title={selectedWallet ? 'Wallet Transactions' : 'Recent Transactions'}
            description={selectedWallet
              ? `Showing transactions for ${mockWallets.find((w) => w.id === selectedWallet)?.client_name}`
              : 'All recent transactions across wallets'}
            padded={false}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    txs.map((tx) => {
                      const isNeg = tx.amount < 0;
                      const TxIcon = isNeg ? TrendingDown : TrendingUp;
                      const typeLabel = tx.transaction_type.replace(/_/g, ' ');
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TxIcon className={cn('h-4 w-4', isNeg ? 'text-destructive' : 'text-success')} />
                              <span className="text-xs text-muted-foreground">{typeLabel}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-mono font-semibold tabular-nums text-sm',
                            isNeg ? 'text-destructive' : 'text-success',
                          )}>
                            {isNeg ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                            ${tx.balance_after.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tx.narration}</TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
