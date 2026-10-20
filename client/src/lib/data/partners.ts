import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useLedger } from './hooks';
import { round2 } from './money';
import type { IBRecord } from './types';

export interface PartnerStats {
  ib: IBRecord;
  clients: number;
  lots: number;          // lots traded by their clients in the period
  earned: number;        // partner pay booked in the period (USD)
  paid: number;          // paid out in the period (USD)
  owed: number;          // what we owe them right now (USD)
  pendingLots: number;   // closed trades not booked yet (today)
}

/** Lots, pay earned, pay given and money owed, for every partner. */
export function usePartnerStats(from: string, to: string) {
  const ibs = useBooks((s) => s.ibs);
  const clients = useBooks((s) => s.clients);
  const trades = useBooks((s) => s.trades);
  const posted = useBooks((s) => s.postedTradeIds);
  const { entries, balances } = useLedger();
  return useMemo(() => {
    const postedSet = new Set(posted);
    const rows: PartnerStats[] = ibs.map((ib) => {
      const myClients = new Set(clients.filter((c) => c.ibParentId === ib.id).map((c) => c.id));
      const inPeriod = trades.filter((t) => myClients.has(t.clientId) && t.status === 'closed' && (t.closedAt ?? '').slice(0, 10) >= from && (t.closedAt ?? '').slice(0, 10) <= to);
      let earned = 0; let paid = 0;
      for (const e of entries) {
        if (e.date < from || e.date > to) continue;
        for (const l of e.lines) {
          if (l.accountCode !== ib.treeAccountCode) continue;
          if (e.kind === 'ib_commission') earned += (l.credit - l.debit) * l.rate;
          if (e.kind === 'ib_payout') paid += (l.debit - l.credit) * l.rate;
        }
      }
      return {
        ib,
        clients: myClients.size,
        lots: round2(inPeriod.reduce((s, t) => s + t.lots, 0)),
        earned: round2(earned),
        paid: round2(paid),
        owed: round2(balances[ib.treeAccountCode] ?? 0),
        pendingLots: round2(inPeriod.filter((t) => !postedSet.has(t.id)).reduce((s, t) => s + t.lots, 0)),
      };
    });
    return rows;
  }, [ibs, clients, trades, posted, entries, balances, from, to]);
}
