import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useIBAuthStore } from '@/stores/ibAuth.store';
import { useLedger } from '@/lib/data/hooks';
import { usePartnerStats } from '@/lib/data/partners';
import { round2 } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';

/** Everything the signed-in partner may see. */
export function useMyIB() {
  const ibId = useIBAuthStore((s) => s.ibUser?.ibId);
  const ib = useBooks((s) => s.ibs.find((i) => i.id === ibId));
  const clients = useBooks((s) => s.clients);
  const trades = useBooks((s) => s.trades);
  const requests = useBooks((s) => s.requests);
  const { entries, balances } = useLedger();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const stats = usePartnerStats(monthStart, today).find((r) => r.ib.id === ibId);

  return useMemo(() => {
    if (!ib) return null;
    const myClients = clients.filter((c) => c.ibParentId === ib.id);
    const perClient = myClients.map((c) => {
      const t = trades.filter((x) => x.clientId === c.id && x.status === 'closed' && (x.closedAt ?? '') >= monthStart);
      const lots = round2(t.reduce((s, x) => s + x.lots, 0));
      return { c, lots, trades: t.length, earned: round2(lots * ib.commissionRate) };
    }).sort((a, b) => b.lots - a.lots);
    const pay = entries
      .filter((e) => (e.kind === 'ib_commission' || e.kind === 'ib_payout') && e.lines.some((l) => l.accountCode === ib.treeAccountCode))
      .map((e) => {
        const amt = round2(e.lines.filter((l) => l.accountCode === ib.treeAccountCode).reduce((s, l) => s + (l.credit - l.debit) * l.rate, 0));
        return { id: e.id, date: e.date, kind: e.kind, amount: amt };
      })
      .reverse();
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = daysAgo(13 - i);
      return { day: d.slice(5), pay: round2(pay.filter((p) => p.date === d && p.kind === 'ib_commission').reduce((s, p) => s + p.amount, 0)) };
    });
    const payRequests = requests
      .filter((r) => r.type === 'ib_withdrawal' && r.lines.some((l) => l.accountNo === ib.treeAccountCode))
      .sort((a, b) => b.requestNo - a.requestNo);
    return {
      ib,
      owed: balances[ib.treeAccountCode] ?? 0,
      earnedMonth: stats?.earned ?? 0,
      lotsMonth: stats?.lots ?? 0,
      clients: myClients,
      perClient,
      pay,
      daily,
      payRequests,
      waitingPay: round2(payRequests.filter((r) => r.status !== 'voucher' && r.status !== 'rejected').reduce((s, r) => s + r.lines[0].amount, 0)),
    };
  }, [ib, clients, trades, requests, entries, balances, stats, monthStart]);
}
