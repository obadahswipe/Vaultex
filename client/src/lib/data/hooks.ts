import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  balanceSheet, categoryTotals, computeBalances, isBalanced, liquidCash, usdBalances,
} from './ledger';
import { computeAlerts, reconcile } from './insights';
import type { Category, ClientRecord, StaffUser } from './types';

/** Balances for every account, in its own currency and in USD, plus totals. */
export function useLedger() {
  const accounts = useBooks((s) => s.accounts);
  const entries = useBooks((s) => s.entries);
  const rates = useBooks((s) => s.rates);
  return useMemo(() => {
    const balances = computeBalances(accounts, entries);
    const usd = usdBalances(accounts, balances, rates);
    const cat = categoryTotals(accounts, usd);
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    return {
      accounts, entries, rates, balances, usd, cat, byCode,
      sheet: balanceSheet(cat),
      cash: liquidCash(cat),
      /** Every entry has equal debit and credit sides (checked one by one). */
      unbalanced: entries.filter((e) => !isBalanced(e)).length,
      ofCategory: (c: Category) => accounts.filter((a) => a.category === c),
    };
  }, [accounts, entries, rates]);
}

/** The staff member using the app right now (the demo lets you switch). */
export function useActingUser(): StaffUser {
  const users = useBooks((s) => s.users);
  const actingAs = useBooks((s) => s.actingAs);
  const authUser = useAuthStore((s) => s.user);
  return useMemo(() => {
    const email = actingAs || authUser?.email || 'admin@demo.com';
    return users.find((u) => u.email === email)
      ?? { id: 'u-x', name: authUser?.full_name ?? email, email, role: (authUser?.role as StaffUser['role']) ?? 'admin', active: true };
  }, [users, actingAs, authUser]);
}

export type { ReconRow } from './insights';

/** Compare every client's money in the books with MT5. */
export function useReconciliation() {
  const { balances, byCode } = useLedger();
  const clients = useBooks((s) => s.clients);
  const mt5 = useBooks((s) => s.mt5Balances);
  const trades = useBooks((s) => s.trades);
  const postedTradeIds = useBooks((s) => s.postedTradeIds);
  const requests = useBooks((s) => s.requests);
  return useMemo(
    () => reconcile({ clients, balances, byCode, mt5, trades, postedTradeIds, requests }),
    [clients, balances, byCode, mt5, trades, postedTradeIds, requests],
  );
}

/** Simple rules that point at things a person should look at. */
export function useAlerts() {
  const requests = useBooks((s) => s.requests);
  const ops = useBooks((s) => s.ops);
  const dismissed = useBooks((s) => s.dismissedAlerts);
  const { balances, byCode, rates } = useLedger();
  const recon = useReconciliation();
  return useMemo(
    () => computeAlerts({ requests, ops, dismissed, balances, byCode, rates, recon: recon.rows }),
    [requests, ops, dismissed, balances, byCode, rates, recon],
  );
}

export function useClientBalance(client?: ClientRecord) {
  const { balances, byCode } = useLedger();
  if (!client) return { balance: 0, currency: 'USD' as const };
  return { balance: balances[client.accountNo] ?? 0, currency: byCode.get(client.accountNo)?.currency ?? 'USD' };
}
