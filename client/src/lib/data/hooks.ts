import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  balanceSheet, categoryTotals, computeBalances, isBalanced, liquidCash, requestTotalUSD, usdBalances,
} from './ledger';
import { round2 } from './money';
import type { Account, Category, ClientRecord, SmartAlert, StaffUser } from './types';

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

export interface ReconRow {
  client: ClientRecord;
  account?: Account;
  books: number;
  mt5: number;
  difference: number;
  waitingRequests: number;  // money already moved on MT5, not yet in the books
  waitingTrades: number;    // trades closed today, booked when the day is closed
  unexplained: number;
  status: 'match' | 'waiting' | 'check';
}

/** Compare every client's money in the books with MT5. */
export function useReconciliation() {
  const { balances, byCode } = useLedger();
  const clients = useBooks((s) => s.clients);
  const mt5 = useBooks((s) => s.mt5Balances);
  const trades = useBooks((s) => s.trades);
  const posted = useBooks((s) => s.postedTradeIds);
  const requests = useBooks((s) => s.requests);
  return useMemo(() => {
    const postedSet = new Set(posted);
    const rows: ReconRow[] = clients.map((client) => {
      const code = client.accountNo;
      const books = balances[code] ?? 0;
      const m = mt5[code] ?? 0;
      const difference = round2(m - books);
      const waitingRequests = round2(requests
        .filter((r) => r.status === 'executed')
        .flatMap((r) => r.lines.map((l) => ({ r, l })))
        .filter(({ l }) => l.accountNo === code)
        .reduce((s, { r, l }) => s + (r.type === 'deposit' || r.type === 'transfer_to' ? l.amount : -l.amount), 0));
      const waitingTrades = round2(trades
        .filter((t) => t.clientId === client.id && t.status === 'closed' && !postedSet.has(t.id))
        .reduce((s, t) => s + t.profit - t.commission, 0));
      const unexplained = round2(difference - waitingRequests - waitingTrades);
      const status: ReconRow['status'] = Math.abs(unexplained) >= 0.01 ? 'check'
        : Math.abs(difference) >= 0.01 ? 'waiting' : 'match';
      return { client, account: byCode.get(code), books, mt5: m, difference, waitingRequests, waitingTrades, unexplained, status };
    });
    const totalBooks = round2(rows.reduce((s, r) => s + r.books, 0));
    const totalMt5 = round2(rows.reduce((s, r) => s + r.mt5, 0));
    return {
      rows,
      totalBooks,
      totalMt5,
      matched: rows.filter((r) => r.status === 'match').length,
      waiting: rows.filter((r) => r.status === 'waiting').length,
      toCheck: rows.filter((r) => r.status === 'check').length,
    };
  }, [clients, balances, byCode, mt5, trades, posted, requests]);
}

/** Simple rules that point at things a person should look at. */
export function useAlerts() {
  const requests = useBooks((s) => s.requests);
  const ops = useBooks((s) => s.ops);
  const dismissed = useBooks((s) => s.dismissedAlerts);
  const { balances, byCode, rates } = useLedger();
  const recon = useReconciliation();
  return useMemo(() => {
    const out: SmartAlert[] = [];
    const now = Date.now();
    for (const r of requests) {
      if (r.status !== 'pending') continue;
      const created = new Date(r.timeline[0]?.at ?? r.date).getTime();
      const hours = (now - created) / 3_600_000;
      if (hours > ops.urgentThresholdHours) {
        out.push({
          id: `pending-${r.id}`, type: 'pending_expired', severity: 'warning', read: false, createdAt: r.timeline[0]?.at ?? r.date, linkedRequestId: r.id,
          title: `Request #${r.requestNo} is still waiting`, titleAr: `الطلب رقم ${r.requestNo} ما زال ينتظر`,
          body: `It has waited more than ${ops.urgentThresholdHours} hours for someone to say OK.`,
          bodyAr: `ينتظر الموافقة منذ أكثر من ${ops.urgentThresholdHours} ساعات.`,
        });
      }
      const total = requestTotalUSD(r, rates);
      if (total >= ops.largeTransactionThreshold) {
        out.push({
          id: `large-${r.id}`, type: 'large_transaction', severity: 'info', read: false, createdAt: r.timeline[0]?.at ?? r.date, linkedRequestId: r.id,
          title: `Big request: $${total.toLocaleString()}`, titleAr: `طلب كبير: ${total.toLocaleString()}$`,
          body: `Request #${r.requestNo} is more than $${ops.largeTransactionThreshold.toLocaleString()}. Check it carefully.`,
          bodyAr: `الطلب رقم ${r.requestNo} أكبر من ${ops.largeTransactionThreshold.toLocaleString()}$. راجعه بعناية.`,
        });
      }
    }
    for (const [code, bal] of Object.entries(balances)) {
      const acc = byCode.get(code);
      if (!acc || acc.category !== 'clients' || bal >= 0) continue;
      const over = acc.creditLimit != null && -bal > acc.creditLimit;
      out.push({
        id: `neg-${code}-${bal}`, type: over ? 'credit_limit' : 'negative_balance', severity: over ? 'critical' : 'warning', read: false,
        createdAt: new Date().toISOString(), linkedAccountCode: code,
        title: `${acc.name} owes us money`, titleAr: `${acc.arabic} مدين لنا`,
        body: `Their balance is ${bal.toLocaleString()} ${acc.currency}.${over ? ' This is more than their limit.' : ''}`,
        bodyAr: `رصيده ${bal.toLocaleString()} ${acc.currency}.${over ? ' وهذا أكثر من الحد المسموح.' : ''}`,
      });
    }
    for (const row of recon.rows) {
      if (row.status !== 'check') continue;
      out.push({
        id: `recon-${row.client.id}-${row.unexplained}`, type: 'reconciliation_gap', severity: 'warning', read: false,
        createdAt: new Date().toISOString(), linkedAccountCode: row.client.accountNo,
        title: `${row.client.name}: MT5 and books do not match`, titleAr: `${row.client.arabic ?? row.client.name}: MT5 والدفاتر غير متطابقين`,
        body: `There is a $${Math.abs(row.unexplained).toLocaleString()} difference nobody has explained yet.`,
        bodyAr: `هناك فرق ${Math.abs(row.unexplained).toLocaleString()}$ لم يُفسَّر بعد.`,
      });
    }
    const dismissedSet = new Set(dismissed);
    const order = { critical: 0, warning: 1, info: 2 };
    return out.filter((a) => !dismissedSet.has(a.id)).sort((a, b) => order[a.severity] - order[b.severity]);
  }, [requests, ops, dismissed, balances, byCode, rates, recon]);
}

export function useClientBalance(client?: ClientRecord) {
  const { balances, byCode } = useLedger();
  if (!client) return { balance: 0, currency: 'USD' as const };
  return { balance: balances[client.accountNo] ?? 0, currency: byCode.get(client.accountNo)?.currency ?? 'USD' };
}
