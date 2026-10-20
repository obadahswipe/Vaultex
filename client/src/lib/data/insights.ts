// Pure versions of the numbers the pages show (MT5 check, partner pay, warnings),
// so the screens and Ask Vaultex always work them out the same way.
import { requestTotalUSD } from './ledger';
import { round2, type Rates } from './money';
import type {
  Account, ClientRecord, IBRecord, LedgerEntry, OperationRequest, OperationsSettings, SmartAlert, Trade,
} from './types';

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

export function reconcile(input: {
  clients: ClientRecord[];
  balances: Record<string, number>;
  byCode: Map<string, Account>;
  mt5: Record<string, number>;
  trades: Trade[];
  postedTradeIds: string[];
  requests: OperationRequest[];
}) {
  const { clients, balances, byCode, mt5, trades, requests } = input;
  const postedSet = new Set(input.postedTradeIds);
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
  return {
    rows,
    totalBooks: round2(rows.reduce((s, r) => s + r.books, 0)),
    totalMt5: round2(rows.reduce((s, r) => s + r.mt5, 0)),
    matched: rows.filter((r) => r.status === 'match').length,
    waiting: rows.filter((r) => r.status === 'waiting').length,
    toCheck: rows.filter((r) => r.status === 'check').length,
  };
}

export interface PartnerStats {
  ib: IBRecord;
  clients: number;
  lots: number;          // lots traded by their clients in the period
  earned: number;        // partner pay booked in the period (USD)
  paid: number;          // paid out in the period (USD)
  owed: number;          // what we owe them right now (USD)
  pendingLots: number;   // closed trades not booked yet (today)
}

export function partnerStats(input: {
  ibs: IBRecord[];
  clients: ClientRecord[];
  trades: Trade[];
  postedTradeIds: string[];
  entries: LedgerEntry[];
  balances: Record<string, number>;
  from: string;
  to: string;
}): PartnerStats[] {
  const { ibs, clients, trades, entries, balances, from, to } = input;
  const postedSet = new Set(input.postedTradeIds);
  return ibs.map((ib) => {
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
}

/** Simple rules that point at things a person should look at. */
export function computeAlerts(input: {
  requests: OperationRequest[];
  ops: OperationsSettings;
  dismissed: string[];
  balances: Record<string, number>;
  byCode: Map<string, Account>;
  rates: Rates;
  recon: ReconRow[];
  now?: number;
}): SmartAlert[] {
  const { requests, ops, balances, byCode, rates } = input;
  const out: SmartAlert[] = [];
  const now = input.now ?? Date.now();
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
      createdAt: new Date(now).toISOString(), linkedAccountCode: code,
      title: `${acc.name} owes us money`, titleAr: `${acc.arabic} مدين لنا`,
      body: `Their balance is ${bal.toLocaleString()} ${acc.currency}.${over ? ' This is more than their limit.' : ''}`,
      bodyAr: `رصيده ${bal.toLocaleString()} ${acc.currency}.${over ? ' وهذا أكثر من الحد المسموح.' : ''}`,
    });
  }
  for (const row of input.recon) {
    if (row.status !== 'check') continue;
    out.push({
      id: `recon-${row.client.id}-${row.unexplained}`, type: 'reconciliation_gap', severity: 'warning', read: false,
      createdAt: new Date(now).toISOString(), linkedAccountCode: row.client.accountNo,
      title: `${row.client.name}: MT5 and books do not match`, titleAr: `${row.client.arabic ?? row.client.name}: MT5 والدفاتر غير متطابقين`,
      body: `There is a $${Math.abs(row.unexplained).toLocaleString()} difference nobody has explained yet.`,
      bodyAr: `هناك فرق ${Math.abs(row.unexplained).toLocaleString()}$ لم يُفسَّر بعد.`,
    });
  }
  const dismissedSet = new Set(input.dismissed);
  const order = { critical: 0, warning: 1, info: 2 };
  return out.filter((a) => !dismissedSet.has(a.id)).sort((a, b) => order[a.severity] - order[b.severity]);
}
