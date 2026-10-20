// Runs Ask Vaultex's tools in the browser, against the same books the person is
// looking at. Tool names and inputs are defined in /api/_lib/tools.ts.
import { useBooks, type BooksState } from '@/stores/books.store';
import {
  balanceSheet, buildRequestLines, categoryTotals, computeBalances, lineEffect, liquidCash,
  PostingError, profitAndLoss, requestTotalUSD, usdBalances,
} from '@/lib/data/ledger';
import { computeAlerts, partnerStats, reconcile } from '@/lib/data/insights';
import { CURRENCIES, type Account, type Category, type ClientRecord, type Currency, type OperationRequest, type RequestType } from '@/lib/data/types';
import { round2, toUSD } from '@/lib/data/money';
import { daysAgo, isoDay } from '@/lib/data/seed';
import { CATEGORY_LABEL, REQUEST_TYPE_LABEL, STATUS_LABEL } from '@/lib/data/labels';

export interface ChartSpec {
  kind: 'bar' | 'line' | 'pie';
  title: string;
  unit?: 'usd' | 'count' | 'lots' | 'percent';
  series?: string[];
  data: { label: string; value: number; value2?: number }[];
}

export interface DraftSpec {
  type: RequestType;
  account: Account;
  counter: Account;
  amount: number;          // in the account's currency
  askedAmount: number;
  askedCurrency: Currency;
  note?: string;
  urgent: boolean;
  balanceBefore: number;
  balanceAfter: number;
}

export type Attachment =
  | { kind: 'chart'; chart: ChartSpec }
  | { kind: 'draft'; draft: DraftSpec }
  | { kind: 'page'; to: string; label?: string };

export interface ToolOutcome {
  result: unknown;
  attachment?: Attachment;
  isError?: boolean;
}

export const PAGE_ROUTES: Record<string, string> = {
  home: '/', money_requests: '/operations', clients: '/clients', partners: '/ib-mgmt', partner_pay: '/ib-commissions',
  trades: '/trades', risk: '/risk', banks_and_cash: '/treasury', exchange_rates: '/currency', client_wallets: '/wallets',
  entries: '/entries', accounts: '/chart-of-accounts', check_the_numbers: '/reconciliation', close_the_day: '/eod',
  reports: '/reports', who_owes_us: '/aging', charts: '/ops-analytics', team: '/hr', branches: '/branches',
  owners: '/ownership', things_we_own: '/assets', new_clients: '/crm', who_did_what: '/workflows',
  staff_logins: '/users', settings: '/settings/general',
};

// ─── Shared working-out ──────────────────────────────────────────────────────

function derive(s: BooksState) {
  const balances = computeBalances(s.accounts, s.entries);
  const usd = usdBalances(s.accounts, balances, s.rates);
  const cat = categoryTotals(s.accounts, usd);
  const byCode = new Map(s.accounts.map((a) => [a.code, a]));
  const recon = reconcile({
    clients: s.clients, balances, byCode, mt5: s.mt5Balances, trades: s.trades,
    postedTradeIds: s.postedTradeIds, requests: s.requests,
  });
  return { balances, usd, cat, byCode, recon };
}

type Derived = ReturnType<typeof derive>;

const norm = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[ً-ٟ]/g, '').trim();

function matches(text: string | undefined, q: string) {
  return !!text && norm(text).includes(norm(q));
}

function findClient(s: BooksState, q: string): ClientRecord | undefined {
  const n = norm(q);
  return s.clients.find((c) => c.id === q || c.accountNo === q || c.mt5Login === q)
    ?? s.clients.find((c) => norm(c.name) === n || (c.arabic && norm(c.arabic) === n))
    ?? s.clients.find((c) => matches(c.name, q) || matches(c.arabic, q) || matches(c.email, q));
}

function findAccount(s: BooksState, q: string, cats?: Category[]): Account | undefined {
  const pool = s.accounts.filter((a) => a.active && (!cats || cats.includes(a.category)));
  const n = norm(q);
  const client = findClient(s, q);
  const ib = s.ibs.find((i) => matches(i.name, q) || matches(i.arabic, q) || i.mt5AccountNo === q);
  return pool.find((a) => a.code === q)
    ?? (client ? pool.find((a) => a.code === client.accountNo) : undefined)
    ?? (ib ? pool.find((a) => a.code === ib.treeAccountCode) : undefined)
    ?? pool.find((a) => norm(a.name) === n || norm(a.arabic) === n)
    ?? pool.find((a) => matches(a.name, q) || matches(a.arabic, q));
}

const nameOfClient = (s: BooksState, code: string) =>
  s.clients.find((c) => c.accountNo === code)?.name ?? s.accounts.find((a) => a.code === code)?.name ?? code;

function hoursSince(iso: string | undefined) {
  if (!iso) return undefined;
  return Math.round(((Date.now() - new Date(iso).getTime()) / 3_600_000) * 10) / 10;
}

function summarizeRequest(s: BooksState, r: OperationRequest) {
  const first = r.lines[0];
  return {
    no: r.requestNo,
    type: r.type,
    type_label: REQUEST_TYPE_LABEL[r.type]?.en,
    stage: r.status,
    stage_label: STATUS_LABEL[r.status]?.en,
    date: r.date,
    who: first ? (first.accountName ?? nameOfClient(s, first.accountNo)) : undefined,
    account: first?.accountNo,
    amount: first ? round2(r.lines.reduce((x, l) => x + l.amount, 0)) : 0,
    currency: first?.currency,
    usd: requestTotalUSD(r, s.rates),
    from_or_to: first?.counterAccountCode ? s.accounts.find((a) => a.code === first.counterAccountCode)?.name : undefined,
    urgent: r.priority === 'urgent',
    made_by: r.createdBy,
    ok_by: r.confirmedBy,
    from_portal: r.source && r.source !== 'staff' ? r.source : undefined,
    waiting_hours: r.status === 'voucher' || r.status === 'rejected' ? undefined : hoursSince(r.timeline.at(-1)?.at),
    note: r.note,
  };
}

function tradeExposure(s: BooksState) {
  const open = s.trades.filter((t) => t.status === 'open');
  const bySymbol: Record<string, { net_lots: number; buy_lots: number; sell_lots: number; floating_client_profit: number; b_book_lots: number; positions: number }> = {};
  for (const t of open) {
    const row = bySymbol[t.symbol] ??= { net_lots: 0, buy_lots: 0, sell_lots: 0, floating_client_profit: 0, b_book_lots: 0, positions: 0 };
    row.positions += 1;
    if (t.side === 'buy') row.buy_lots += t.lots; else row.sell_lots += t.lots;
    row.net_lots += t.side === 'buy' ? t.lots : -t.lots;
    row.floating_client_profit += t.profit;
    if (t.book === 'B') row.b_book_lots += t.lots;
  }
  for (const r of Object.values(bySymbol)) {
    r.net_lots = round2(r.net_lots); r.buy_lots = round2(r.buy_lots); r.sell_lots = round2(r.sell_lots);
    r.floating_client_profit = round2(r.floating_client_profit); r.b_book_lots = round2(r.b_book_lots);
  }
  const floating = round2(open.reduce((x, t) => x + t.profit, 0));
  const bFloating = round2(open.filter((t) => t.book === 'B').reduce((x, t) => x + t.profit, 0));
  return {
    open_positions: open.length,
    client_floating_profit: floating,
    company_risk_on_b_book: round2(-bFloating),
    by_symbol: bySymbol,
  };
}

// ─── Tools ───────────────────────────────────────────────────────────────────

type Input = Record<string, unknown>;
const sInput = (i: Input, k: string) => (typeof i[k] === 'string' && (i[k] as string).trim() ? (i[k] as string).trim() : undefined);
const nInput = (i: Input, k: string) => (typeof i[k] === 'number' && Number.isFinite(i[k]) ? (i[k] as number) : undefined);
const clamp = (v: number | undefined, lo: number, hi: number, d: number) => Math.min(hi, Math.max(lo, Math.round(v ?? d)));

function getSnapshot(s: BooksState, d: Derived) {
  const today = isoDay(new Date());
  const monthStart = today.slice(0, 8) + '01';
  const lastMonthEnd = daysAgo(Number(today.slice(8, 10)));
  const lastMonthStart = lastMonthEnd.slice(0, 8) + '01';
  const month = profitAndLoss(s.accounts, s.entries, monthStart, today);
  const lastMonth = profitAndLoss(s.accounts, s.entries, lastMonthStart, lastMonthEnd);
  const sheet = balanceSheet(d.cat);
  const stage = (st: string) => s.requests.filter((r) => r.status === st);
  const alerts = computeAlerts({
    requests: s.requests, ops: s.ops, dismissed: s.dismissedAlerts, balances: d.balances, byCode: d.byCode, rates: s.rates, recon: d.recon.rows,
  });
  const stuck = s.requests.filter((r) => r.status === 'confirmed' || r.status === 'executed');
  const partners = partnerStats({
    ibs: s.ibs, clients: s.clients, trades: s.trades, postedTradeIds: s.postedTradeIds, entries: s.entries, balances: d.balances, from: monthStart, to: today,
  });
  const exposure = tradeExposure(s);
  const pendingSorted = stage('pending').sort((a, b) => (a.timeline[0]?.at ?? '').localeCompare(b.timeline[0]?.at ?? ''));
  return {
    company: s.general.brokerName,
    today,
    money_on_hand_cash_and_banks: liquidCash(d.cat),
    money_partners_hold_for_us: d.cat.suppliers,
    what_we_own_total: sheet.own,
    what_we_owe_total: sheet.owe,
    clients_money_with_us: d.cat.clients,
    owed_to_partners_ibs: d.cat.ibs,
    bills_to_pay: d.cat.debts,
    owners_money: sheet.owners,
    books_balanced: sheet.balanced,
    profit_this_month: { income: month.totalIncome, costs: month.totalCosts, profit: month.profit, top_income: month.income.slice(0, 4), top_costs: [...month.costs].sort((a, b) => b.amount - a.amount).slice(0, 4) },
    profit_last_month: { income: lastMonth.totalIncome, costs: lastMonth.totalCosts, profit: lastMonth.profit },
    money_requests: {
      needs_ok: stage('pending').length,
      ok_given_send_money: stage('confirmed').length,
      money_sent_write_in_books: stage('executed').length,
      done_last_7_days: s.requests.filter((r) => r.status === 'voucher' && r.date >= daysAgo(7)).length,
      oldest_waiting: pendingSorted.slice(0, 5).map((r) => summarizeRequest(s, r)),
      urgent_open: s.requests.filter((r) => r.priority === 'urgent' && ['pending', 'confirmed', 'executed'].includes(r.status)).length,
    },
    mt5_vs_books: {
      clients: d.recon.rows.length,
      match: d.recon.matched,
      waiting_for_day_close: d.recon.waiting,
      need_a_look: d.recon.toCheck,
      unexplained_total: round2(d.recon.rows.reduce((x, r) => x + Math.abs(r.unexplained), 0)),
      need_a_look_list: d.recon.rows.filter((r) => r.status === 'check').slice(0, 6).map((r) => ({ client: r.client.name, account: r.client.accountNo, books: r.books, mt5: r.mt5, unexplained: r.unexplained })),
    },
    day_close: {
      closed_through: s.closedThrough,
      can_close_today: stuck.length === 0,
      blocking_requests: stuck.length,
      closed_trades_not_booked: s.trades.filter((t) => t.status === 'closed' && !s.postedTradeIds.includes(t.id)).length,
    },
    partners_this_month: partners.map((p) => ({ partner: p.ib.name, clients: p.clients, lots: p.lots, earned: p.earned, owed_now: p.owed })),
    trading_now: { open_positions: exposure.open_positions, client_floating_profit: exposure.client_floating_profit, company_risk_on_b_book: exposure.company_risk_on_b_book },
    clients: { active: s.clients.filter((c) => c.active).length, papers_missing: s.clients.filter((c) => c.kycStatus && c.kycStatus !== 'approved').length, owe_us: d.recon.rows.filter((r) => r.books < 0).length },
    warnings: alerts.slice(0, 10).map((a) => ({ level: a.severity, title: a.title, detail: a.body })),
    settings: { two_person_rule: s.ops.requireDifferentConfirmer, big_request_from_usd: s.ops.largeTransactionThreshold, waiting_too_long_after_hours: s.ops.urgentThresholdHours },
  };
}

function findClients(s: BooksState, d: Derived, i: Input) {
  const q = sInput(i, 'query');
  const filter = sInput(i, 'filter') ?? 'all';
  const sortBy = sInput(i, 'sort_by') ?? 'balance';
  const limit = clamp(nInput(i, 'limit'), 1, 50, 15);
  const lots = new Map<string, number>();
  for (const t of s.trades) lots.set(t.clientId, (lots.get(t.clientId) ?? 0) + t.lots);
  let rows = d.recon.rows.map((r) => {
    const acc = d.byCode.get(r.client.accountNo);
    return {
      r,
      out: {
        name: r.client.name,
        arabic: r.client.arabic,
        account: r.client.accountNo,
        mt5_login: r.client.mt5Login,
        balance: r.books,
        currency: acc?.currency ?? 'USD',
        balance_usd: d.usd[r.client.accountNo] ?? 0,
        mt5: r.mt5,
        check: r.status,
        unexplained: r.unexplained,
        partner: s.ibs.find((ib) => ib.id === r.client.ibParentId)?.name,
        marked: r.client.classification,
        papers: r.client.kycStatus,
        country: r.client.country,
        active: r.client.active,
        lots_traded: round2(lots.get(r.client.id) ?? 0),
      },
    };
  });
  if (q) rows = rows.filter(({ r }) => matches(r.client.name, q) || matches(r.client.arabic, q) || matches(r.client.email, q) || r.client.accountNo === q || r.client.mt5Login === q);
  if (filter === 'owes_us') rows = rows.filter(({ r }) => r.books < 0);
  if (filter === 'mismatch') rows = rows.filter(({ r }) => r.status === 'check');
  if (filter === 'kyc_missing') rows = rows.filter(({ r }) => r.client.kycStatus && r.client.kycStatus !== 'approved');
  if (filter === 'careful') rows = rows.filter(({ r }) => r.client.classification === 'bad' || r.client.classification === 'fraud');
  if (filter === 'inactive') rows = rows.filter(({ r }) => !r.client.active);
  const sorters: Record<string, (a: typeof rows[number], b: typeof rows[number]) => number> = {
    balance: (a, b) => b.out.balance_usd - a.out.balance_usd,
    name: (a, b) => a.out.name.localeCompare(b.out.name),
    difference: (a, b) => Math.abs(b.out.unexplained) - Math.abs(a.out.unexplained),
    trading: (a, b) => b.out.lots_traded - a.out.lots_traded,
  };
  rows.sort(sorters[sortBy] ?? sorters.balance);
  return { total_found: rows.length, clients: rows.slice(0, limit).map((x) => x.out) };
}

function getClient(s: BooksState, d: Derived, i: Input): ToolOutcome {
  const q = sInput(i, 'client') ?? '';
  const c = findClient(s, q);
  if (!c) return { result: { error: `No client matches "${q}". Try find_clients with a shorter part of the name.` }, isError: true };
  const row = d.recon.rows.find((r) => r.client.id === c.id);
  const acc = d.byCode.get(c.accountNo);
  const trades = s.trades.filter((t) => t.clientId === c.id);
  const closed = trades.filter((t) => t.status === 'closed');
  return {
    result: {
      name: c.name, arabic: c.arabic, account: c.accountNo, mt5_login: c.mt5Login, email: c.email, phone: c.phone, country: c.country,
      joined: c.joinDate, active: c.active, marked: c.classification, papers: c.kycStatus, notes: c.notes, credit_limit: c.creditLimit,
      partner: s.ibs.find((ib) => ib.id === c.ibParentId)?.name,
      balance: row?.books, currency: acc?.currency, balance_usd: d.usd[c.accountNo],
      mt5_check: row && { mt5: row.mt5, difference: row.difference, explained_by_money_sent: row.waitingRequests, explained_by_trades_today: row.waitingTrades, unexplained: row.unexplained, status: row.status },
      requests: s.requests.filter((r) => r.lines.some((l) => l.accountNo === c.accountNo)).slice(0, 10).map((r) => summarizeRequest(s, r)),
      open_trades: trades.filter((t) => t.status === 'open').map((t) => ({ ticket: t.ticket, symbol: t.symbol, side: t.side, lots: t.lots, open_price: t.openPrice, now: t.currentPrice, profit: t.profit, book: t.book })),
      closed_trades: { count: closed.length, lots: round2(closed.reduce((x, t) => x + t.lots, 0)), client_profit: round2(closed.reduce((x, t) => x + t.profit, 0)), fees_paid: round2(closed.reduce((x, t) => x + t.commission, 0)) },
      wallets: s.wallets.filter((w) => w.clientId === c.id).map((w) => ({ kind: w.kind, provider: w.provider, currency: w.currency, verified: w.verified })),
      help_tickets: s.tickets.filter((t) => t.clientId === c.id).map((t) => ({ subject: t.subject, status: t.status })),
    },
  };
}

function listRequests(s: BooksState, i: Input) {
  const status = sInput(i, 'status') ?? 'open';
  const type = sInput(i, 'type') ?? 'any';
  const who = sInput(i, 'client');
  const days = nInput(i, 'days');
  const limit = clamp(nInput(i, 'limit'), 1, 60, 20);
  const whoAcc = who ? findAccount(s, who) : undefined;
  let list = s.requests.filter((r) =>
    (status === 'all' || (status === 'open' ? ['pending', 'confirmed', 'executed'].includes(r.status) : r.status === status))
    && (type === 'any' || r.type === type)
    && (!days || r.date >= daysAgo(days))
    && (!who || r.lines.some((l) => l.accountNo === whoAcc?.code || matches(l.accountName, who))));
  list = [...list].sort((a, b) => (b.timeline[0]?.at ?? b.date).localeCompare(a.timeline[0]?.at ?? a.date));
  return {
    total_found: list.length,
    total_usd: round2(list.reduce((x, r) => x + requestTotalUSD(r, s.rates), 0)),
    requests: list.slice(0, limit).map((r) => summarizeRequest(s, r)),
  };
}

function getTrades(s: BooksState, i: Input) {
  const status = sInput(i, 'status') ?? 'all';
  const symbol = sInput(i, 'symbol')?.toUpperCase();
  const who = sInput(i, 'client');
  const days = clamp(nInput(i, 'days'), 1, 365, 30);
  const client = who ? findClient(s, who) : undefined;
  const since = daysAgo(days);
  const pool = s.trades.filter((t) => (!symbol || t.symbol === symbol) && (!client || t.clientId === client.id));
  const closed = pool.filter((t) => t.status === 'closed' && (t.closedAt ?? '').slice(0, 10) >= since);
  const open = pool.filter((t) => t.status === 'open');
  const byClient = new Map<string, number>();
  for (const t of closed) byClient.set(t.clientId, (byClient.get(t.clientId) ?? 0) + t.profit);
  const ranked = [...byClient.entries()].map(([id, p]) => ({ client: s.clients.find((c) => c.id === id)?.name ?? id, client_profit: round2(p) })).sort((a, b) => b.client_profit - a.client_profit);
  const sym: Record<string, { trades: number; lots: number; client_profit: number }> = {};
  for (const t of closed) {
    const r = sym[t.symbol] ??= { trades: 0, lots: 0, client_profit: 0 };
    r.trades += 1; r.lots = round2(r.lots + t.lots); r.client_profit = round2(r.client_profit + t.profit);
  }
  const exposure = tradeExposure({ ...s, trades: pool });
  return {
    note: 'Client profit is the client side. When clients win on B-book trades, the company loses that amount.',
    open: status === 'closed' ? undefined : {
      ...exposure,
      biggest: [...open].sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit)).slice(0, 8)
        .map((t) => ({ ticket: t.ticket, client: s.clients.find((c) => c.id === t.clientId)?.name, symbol: t.symbol, side: t.side, lots: t.lots, profit: t.profit, book: t.book })),
    },
    closed: status === 'open' ? undefined : {
      days,
      trades: closed.length,
      lots: round2(closed.reduce((x, t) => x + t.lots, 0)),
      client_profit: round2(closed.reduce((x, t) => x + t.profit, 0)),
      fees_charged: round2(closed.reduce((x, t) => x + t.commission, 0)),
      b_book_company_result: round2(-closed.filter((t) => t.book === 'B').reduce((x, t) => x + t.profit, 0)),
      by_symbol: sym,
      best_clients: ranked.slice(0, 5),
      worst_clients: ranked.slice(-5).reverse(),
    },
  };
}

function getMoneyPlaces(s: BooksState, d: Derived) {
  const rows = s.accounts.filter((a) => ['funds', 'banks', 'suppliers'].includes(a.category) && a.active).map((a) => ({
    account: a.code, name: a.name, kind: CATEGORY_LABEL[a.category].en, currency: a.currency, balance: d.balances[a.code] ?? 0, usd: d.usd[a.code] ?? 0,
  }));
  const byCurrency: Record<string, number> = {};
  for (const r of rows) byCurrency[r.currency] = round2((byCurrency[r.currency] ?? 0) + r.usd);
  return { total_usd: round2(rows.reduce((x, r) => x + r.usd, 0)), usd_by_currency: byCurrency, places: rows };
}

function getAccounts(s: BooksState, d: Derived, i: Input) {
  const cat = sInput(i, 'category') ?? 'any';
  const q = sInput(i, 'query');
  const limit = clamp(nInput(i, 'limit'), 1, 80, 30);
  const list = s.accounts.filter((a) => (cat === 'any' || a.category === cat) && (!q || a.code.startsWith(q) || matches(a.name, q) || matches(a.arabic, q)));
  return {
    total_found: list.length,
    total_usd: round2(list.reduce((x, a) => x + (d.usd[a.code] ?? 0), 0)),
    accounts: list.slice(0, limit).map((a) => ({
      account: a.code, name: a.name, arabic: a.arabic, group: CATEGORY_LABEL[a.category].en, currency: a.currency,
      balance: d.balances[a.code] ?? 0, usd: d.usd[a.code] ?? 0, active: a.active,
    })),
  };
}

function getEntries(s: BooksState, d: Derived, i: Input) {
  const q = sInput(i, 'query');
  const accQ = sInput(i, 'account');
  const days = nInput(i, 'days');
  const limit = clamp(nInput(i, 'limit'), 1, 40, 15);
  const acc = accQ ? findAccount(s, accQ) : undefined;
  const list = [...s.entries].reverse().filter((e) =>
    (!days || e.date >= daysAgo(days))
    && (!q || matches(e.memo, q) || String(e.no) === q.replace(/\D/g, ''))
    && (!accQ || e.lines.some((l) => l.accountCode === acc?.code)));
  return {
    total_found: list.length,
    entries: list.slice(0, limit).map((e) => ({
      voucher: e.no, date: e.date, note: e.memo, kind: e.kind, by: e.createdBy,
      lines: e.lines.map((l) => {
        const a = d.byCode.get(l.accountCode);
        return { account: l.accountCode, name: a?.name, in: l.debit || undefined, out: l.credit || undefined, currency: l.currency, effect_on_balance: a ? round2(lineEffect(a, l)) : undefined };
      }),
    })),
  };
}

function getRates(s: BooksState) {
  const hist = s.rateHistory;
  const at = (n: number) => hist.find((h) => h.date >= daysAgo(n))?.rates ?? {};
  const week = at(7); const month = at(30);
  return {
    usd_for_one_unit: s.rates,
    updated: s.ratesUpdatedAt,
    change_percent: Object.fromEntries(CURRENCIES.filter((c) => c !== 'USD' && c !== 'USDT').map((c) => {
      const now = s.rates[c]; const w = week[c]; const m = month[c];
      return [c, { last_7_days: w ? round2(((now - w) / w) * 100) : undefined, last_30_days: m ? round2(((now - m) / m) * 100) : undefined }];
    })),
  };
}

function getTeam(s: BooksState) {
  const branch = (id?: string) => s.branches.find((b) => b.id === id)?.name;
  return {
    staff: s.employees.map((e) => ({ name: e.name, role: e.role, branch: branch(e.branchId), salary_usd: e.salary, days_off_left: e.leaveDaysLeft, active: e.active })),
    monthly_salaries_usd: s.employees.filter((e) => e.active).reduce((x, e) => x + e.salary, 0),
    days_off_waiting: s.leaves.filter((l) => l.status === 'pending').map((l) => ({ who: s.employees.find((e) => e.id === l.employeeId)?.name, from: l.from, to: l.to, reason: l.reason })),
    salaries_paid: s.payrolls.slice(-6).map((p) => ({ month: p.month, total: p.total })),
    branches: s.branches.map((b) => ({ name: b.name, city: b.city, manager: b.manager, active: b.active })),
    logins: s.users.map((u) => ({ name: u.name, email: u.email, role: u.role, active: u.active, last_seen: u.lastSeen })),
  };
}

function getActivity(s: BooksState, i: Input) {
  const who = sInput(i, 'who');
  const limit = clamp(nInput(i, 'limit'), 1, 60, 25);
  const user = who ? s.users.find((u) => matches(u.name, who) || matches(u.email, who)) : undefined;
  const list = s.audit.filter((a) => !who || a.by === user?.email || matches(a.by, who));
  return { total_found: list.length, actions: list.slice(0, limit).map((a) => ({ at: a.at, by: a.by, did: a.action })) };
}

function showChart(i: Input): ToolOutcome {
  const data = Array.isArray(i.data) ? (i.data as ChartSpec['data']).filter((p) => p && typeof p.label === 'string' && Number.isFinite(p.value)).slice(0, 40) : [];
  const kind = (['bar', 'line', 'pie'] as const).find((k) => k === i.kind) ?? 'bar';
  if (!data.length) return { result: { error: 'The chart needs at least one point with a label and a number.' }, isError: true };
  const chart: ChartSpec = {
    kind, data,
    title: sInput(i, 'title') ?? '',
    unit: (['usd', 'count', 'lots', 'percent'] as const).find((u) => u === i.unit),
    series: Array.isArray(i.series) ? (i.series as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 2) : undefined,
  };
  return { result: { shown: true, points: data.length }, attachment: { kind: 'chart', chart } };
}

const WHO: Record<string, Category[]> = {
  deposit: ['clients'], withdrawal: ['clients'], ib_deposit: ['ibs'], ib_withdrawal: ['ibs'],
  transfer_from: ['clients', 'funds', 'banks', 'suppliers'], expense: ['expenses'],
};

function draftRequest(s: BooksState, d: Derived, i: Input): ToolOutcome {
  const type = sInput(i, 'type') as RequestType | undefined;
  if (!type || !WHO[type]) return { result: { error: 'Unknown request type.' }, isError: true };
  const accountQ = sInput(i, 'account') ?? '';
  const account = findAccount(s, accountQ, WHO[type]);
  if (!account) {
    return { result: { error: `Could not find "${accountQ}" for this kind of request. It must be one of: ${WHO[type].map((c) => CATEGORY_LABEL[c].en).join(', ')}.` }, isError: true };
  }
  const asked = nInput(i, 'amount');
  if (!asked || asked <= 0) return { result: { error: 'The amount must be more than zero.' }, isError: true };
  const askedCurrency = (CURRENCIES.find((c) => c === i.currency) ?? account.currency) as Currency;
  const amount = round2(askedCurrency === account.currency ? asked : toUSD(asked, askedCurrency, s.rates) / (s.rates[account.currency] ?? 1));

  const counterCats: Category[] = type === 'transfer_from'
    ? (account.category === 'clients' ? ['clients'] : ['funds', 'banks', 'suppliers'])
    : ['funds', 'banks', 'suppliers'];
  const counterQ = sInput(i, 'counter_account');
  let counter = counterQ ? findAccount(s, counterQ, counterCats) : undefined;
  if (counterQ && !counter) return { result: { error: `Could not find a money place called "${counterQ}".` }, isError: true };
  if (!counter) {
    // Best match: a bank or cash box in the same currency, with the most money for money going out.
    const pool = s.accounts.filter((a) => a.active && counterCats.includes(a.category) && a.code !== account.code);
    const same = pool.filter((a) => a.currency === account.currency);
    const ranked = (same.length ? same : pool).sort((a, b) => (d.usd[b.code] ?? 0) - (d.usd[a.code] ?? 0));
    counter = ranked.find((a) => a.category === 'banks') ?? ranked[0];
  }
  if (!counter) return { result: { error: 'There is no bank or cash box to use.' }, isError: true };

  const probe: OperationRequest = {
    id: 'draft', requestNo: 0, type, date: isoDay(new Date()), priority: 'normal', status: 'pending',
    lines: [{ id: 'x', accountNo: account.code, accountName: account.name, amount, currency: account.currency, counterAccountCode: counter.code }],
    createdBy: s.actingAs, timeline: [],
  };
  let after = d.balances[account.code] ?? 0;
  try {
    const lines = buildRequestLines(probe, s.accounts, s.rates);
    after = round2(after + lines.filter((l) => l.accountCode === account.code).reduce((x, l) => x + lineEffect(account, l), 0));
  } catch (e) {
    return { result: { error: e instanceof PostingError ? e.en : String(e) }, isError: true };
  }
  const warnings: string[] = [];
  if (type === 'withdrawal' && after < 0) warnings.push(`After this the client would owe us ${Math.abs(after)} ${account.currency}.`);
  if ((type === 'withdrawal' || type === 'ib_withdrawal' || type === 'expense') && (d.balances[counter.code] ?? 0) < amount) warnings.push(`${counter.name} may not have enough money.`);
  if (toUSD(amount, account.currency, s.rates) >= s.ops.largeTransactionThreshold) warnings.push('This is a big request. It will be flagged for a careful check.');
  const client = s.clients.find((c) => c.accountNo === account.code);
  if (client?.classification === 'fraud' || client?.classification === 'bad') warnings.push(`This client is marked "${client.classification}".`);
  if (client && client.kycStatus && client.kycStatus !== 'approved') warnings.push('This client still has missing papers.');

  const draft: DraftSpec = {
    type, account, counter, amount, askedAmount: asked, askedCurrency, note: sInput(i, 'note'), urgent: i.urgent === true,
    balanceBefore: d.balances[account.code] ?? 0, balanceAfter: after,
  };
  return {
    result: {
      drafted: true,
      created: false,
      summary: `${REQUEST_TYPE_LABEL[type].en}: ${amount} ${account.currency} for ${account.name}, ${type === 'transfer_from' ? 'to' : 'using'} ${counter.name}.`,
      balance_before: draft.balanceBefore,
      balance_after: after,
      warnings,
      next: 'The person must press "Create request". Then a second person must say OK.',
    },
    attachment: { kind: 'draft', draft },
  };
}

function openPage(i: Input): ToolOutcome {
  const page = sInput(i, 'page') ?? '';
  const to = PAGE_ROUTES[page];
  if (!to) return { result: { error: 'Unknown page.' }, isError: true };
  return { result: { button_shown: true }, attachment: { kind: 'page', to, label: sInput(i, 'label') } };
}

export function runTool(name: string, input: Input): ToolOutcome {
  const s = useBooks.getState();
  const d = derive(s);
  try {
    switch (name) {
      case 'get_snapshot': return { result: getSnapshot(s, d) };
      case 'find_clients': return { result: findClients(s, d, input) };
      case 'get_client': return getClient(s, d, input);
      case 'list_requests': return { result: listRequests(s, input) };
      case 'get_partners': {
        const today = isoDay(new Date());
        const from = sInput(input, 'from') ?? today.slice(0, 8) + '01';
        const to = sInput(input, 'to') ?? today;
        const rows = partnerStats({ ibs: s.ibs, clients: s.clients, trades: s.trades, postedTradeIds: s.postedTradeIds, entries: s.entries, balances: d.balances, from, to });
        return { result: { from, to, partners: rows.map((p) => ({ partner: p.ib.name, arabic: p.ib.arabic, pay_per_lot_usd: p.ib.commissionRate, marked: p.ib.classification, active: p.ib.active, clients: p.clients, lots: p.lots, earned: p.earned, paid: p.paid, owed_now: p.owed, lots_not_booked_yet: p.pendingLots })) } };
      }
      case 'get_trades': return { result: getTrades(s, input) };
      case 'get_money_places': return { result: getMoneyPlaces(s, d) };
      case 'get_profit': {
        const from = sInput(input, 'from') ?? isoDay(new Date()).slice(0, 8) + '01';
        const to = sInput(input, 'to') ?? isoDay(new Date());
        return { result: { from, to, ...profitAndLoss(s.accounts, s.entries, from, to) } };
      }
      case 'get_accounts': return { result: getAccounts(s, d, input) };
      case 'get_entries': return { result: getEntries(s, d, input) };
      case 'get_rates': return { result: getRates(s) };
      case 'get_team': return { result: getTeam(s) };
      case 'get_activity': return { result: getActivity(s, input) };
      case 'show_chart': return showChart(input);
      case 'draft_money_request': return draftRequest(s, d, input);
      case 'open_page': return openPage(input);
      default: return { result: { error: `Unknown tool ${name}.` }, isError: true };
    }
  } catch (e) {
    return { result: { error: e instanceof Error ? e.message : String(e) }, isError: true };
  }
}

/** Used by the offline briefing and the suggestion chips. */
export function snapshotNow() {
  const s = useBooks.getState();
  return getSnapshot(s, derive(s));
}
