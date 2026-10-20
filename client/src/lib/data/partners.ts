import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useLedger } from './hooks';
import { partnerStats } from './insights';

export type { PartnerStats } from './insights';

/** Lots, pay earned, pay given and money owed, for every partner. */
export function usePartnerStats(from: string, to: string) {
  const ibs = useBooks((s) => s.ibs);
  const clients = useBooks((s) => s.clients);
  const trades = useBooks((s) => s.trades);
  const postedTradeIds = useBooks((s) => s.postedTradeIds);
  const { entries, balances } = useLedger();
  return useMemo(
    () => partnerStats({ ibs, clients, trades, postedTradeIds, entries, balances, from, to }),
    [ibs, clients, trades, postedTradeIds, entries, balances, from, to],
  );
}
