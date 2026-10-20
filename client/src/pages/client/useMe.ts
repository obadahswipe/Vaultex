import { useMemo } from 'react';
import { useBooks } from '@/stores/books.store';
import { useClientAuthStore } from '@/stores/clientAuth.store';
import { useLedger } from '@/lib/data/hooks';
import { lineEffect } from '@/lib/data/ledger';
import { round2 } from '@/lib/data/money';
import type { RequestStatus } from '@/lib/data/types';

/** Everything the signed-in client may see about their own account. */
export function useMe() {
  const clientId = useClientAuthStore((s) => s.clientUser?.clientId);
  const client = useBooks((s) => s.clients.find((c) => c.id === clientId));
  const trades = useBooks((s) => s.trades);
  const requests = useBooks((s) => s.requests);
  const mt5 = useBooks((s) => s.mt5Balances);
  const { byCode, balances, entries } = useLedger();

  return useMemo(() => {
    const account = client ? byCode.get(client.accountNo) : undefined;
    const myTrades = client ? trades.filter((t) => t.clientId === client.id) : [];
    const open = myTrades.filter((t) => t.status === 'open');
    const myRequests = client
      ? requests.filter((r) => r.lines.some((l) => l.accountNo === client.accountNo)).sort((a, b) => b.requestNo - a.requestNo)
      : [];
    const statement = account
      ? entries.filter((e) => e.lines.some((l) => l.accountCode === account.code)).map((e) => ({
          entry: e,
          change: round2(e.lines.filter((l) => l.accountCode === account.code).reduce((s, l) => s + lineEffect(account, l), 0)),
        }))
      : [];
    return {
      client,
      account,
      currency: account?.currency ?? 'USD',
      balance: client ? balances[client.accountNo] ?? 0 : 0,
      mt5Balance: client ? mt5[client.accountNo] ?? 0 : 0,
      floating: round2(open.reduce((s, t) => s + t.profit, 0)),
      trades: myTrades,
      open,
      requests: myRequests,
      statement,
    };
  }, [client, byCode, balances, trades, requests, mt5, entries]);
}

/** How a request's step is explained to a client. */
export const CLIENT_STATUS: Record<RequestStatus, { en: string; ar: string; tone: string }> = {
  pending:   { en: 'We got your request',  ar: 'استلمنا طلبك',     tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  confirmed: { en: 'Approved',             ar: 'تمت الموافقة',     tone: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  executed:  { en: 'Money sent',           ar: 'أُرسل المال',       tone: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300' },
  voucher:   { en: 'Done',                 ar: 'تم',              tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected:  { en: 'Declined',             ar: 'مرفوض',           tone: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' },
};
