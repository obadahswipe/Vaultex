// Pure accounting helpers. No React, no store — easy to test and reuse on a server later.
import {
  CATEGORIES, CATEGORY_GROUP, DEBIT_NORMAL,
  type Account, type AccountGroup, type Category, type Currency,
  type LedgerEntry, type LedgerLine, type OperationRequest,
} from './types';
import { round2, toUSD, type Rates } from './money';

export const EPSILON = 0.01;

/** How much one line moves an account, in the account's "human" direction. */
export function lineEffect(account: Pick<Account, 'category'>, line: Pick<LedgerLine, 'debit' | 'credit'>) {
  return DEBIT_NORMAL[account.category] ? line.debit - line.credit : line.credit - line.debit;
}

/** Balance of every account in its own currency, read the way a person reads it. */
export function computeBalances(accounts: Account[], entries: LedgerEntry[], upToDate?: string) {
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const balances: Record<string, number> = {};
  for (const a of accounts) balances[a.code] = a.opening;
  for (const e of entries) {
    if (upToDate && e.date > upToDate) continue;
    for (const l of e.lines) {
      const acc = byCode.get(l.accountCode);
      if (!acc) continue;
      balances[acc.code] = round2((balances[acc.code] ?? 0) + lineEffect(acc, l));
    }
  }
  return balances;
}

export function usdBalances(accounts: Account[], balances: Record<string, number>, rates: Rates) {
  const out: Record<string, number> = {};
  for (const a of accounts) out[a.code] = round2(toUSD(balances[a.code] ?? 0, a.currency, rates));
  return out;
}

export function categoryTotals(accounts: Account[], usd: Record<string, number>) {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const a of accounts) totals[a.category] = round2(totals[a.category] + (usd[a.code] ?? 0));
  return totals;
}

export function groupTotals(cat: Record<Category, number>) {
  const g: Record<AccountGroup, number> = { own: 0, owe: 0, owners: 0, earned: 0, spent: 0 };
  for (const c of CATEGORIES) g[CATEGORY_GROUP[c]] = round2(g[CATEGORY_GROUP[c]] + cat[c]);
  return g;
}

/** Money we can use today: cash + banks. */
export const liquidCash = (cat: Record<Category, number>) => round2(cat.funds + cat.banks);

/**
 * The balance sheet in USD at today's rates. Rates move, so foreign money is
 * worth a little more or less than when it was booked. That difference is shown
 * as "currency effect" so both sides always match.
 */
export function balanceSheet(cat: Record<Category, number>) {
  const g = groupTotals(cat);
  const profit = round2(g.earned - g.spent);
  const currencyEffect = round2(g.own - g.owe - g.owners - profit);
  return {
    own: g.own,
    owe: g.owe,
    owners: g.owners,
    profit,
    currencyEffect,
    balanced: Math.abs(g.own - (g.owe + g.owners + profit + currencyEffect)) < EPSILON,
  };
}

export interface PnLLine { code: string; name: string; arabic: string; amount: number }

/** Income and costs booked between two dates (USD at the rate used when booked). */
export function profitAndLoss(accounts: Account[], entries: LedgerEntry[], from: string, to: string) {
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const sums: Record<string, number> = {};
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    for (const l of e.lines) {
      const acc = byCode.get(l.accountCode);
      if (!acc || (acc.category !== 'revenue' && acc.category !== 'expenses')) continue;
      sums[acc.code] = (sums[acc.code] ?? 0) + lineEffect(acc, l) * l.rate;
    }
  }
  const pick = (cat: Category): PnLLine[] =>
    accounts
      .filter((a) => a.category === cat)
      .map((a) => ({ code: a.code, name: a.name, arabic: a.arabic, amount: round2(sums[a.code] ?? 0) }))
      .filter((l) => Math.abs(l.amount) >= EPSILON);
  const income = pick('revenue');
  const costs = pick('expenses');
  const totalIncome = round2(income.reduce((s, l) => s + l.amount, 0));
  const totalCosts = round2(costs.reduce((s, l) => s + l.amount, 0));
  return { income, costs, totalIncome, totalCosts, profit: round2(totalIncome - totalCosts) };
}

export interface TrialRow { code: string; name: string; arabic: string; category: Category; debit: number; credit: number }

/** Every account with its USD balance split into debit and credit columns. */
export function trialBalance(accounts: Account[], usd: Record<string, number>) {
  const rows: TrialRow[] = accounts.map((a) => {
    const v = usd[a.code] ?? 0;
    const asDebit = DEBIT_NORMAL[a.category] ? v : -v;
    return {
      code: a.code, name: a.name, arabic: a.arabic, category: a.category,
      debit: asDebit > 0 ? round2(asDebit) : 0,
      credit: asDebit < 0 ? round2(-asDebit) : 0,
    };
  }).filter((r) => r.debit || r.credit);
  // Foreign money is shown at today's rate, so it may be worth a little more or less than
  // when it was booked. That gap is shown on its own line, like the balance sheet does.
  const rawDiff = round2(rows.reduce((s, r) => s + r.debit - r.credit, 0));
  if (Math.abs(rawDiff) >= EPSILON) {
    rows.push({
      code: 'FX', name: 'Currency effect (rates moved)', arabic: 'أثر تغيّر أسعار العملات', category: 'partners',
      debit: rawDiff < 0 ? -rawDiff : 0, credit: rawDiff > 0 ? rawDiff : 0,
    });
  }
  const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));
  return { rows, totalDebit, totalCredit, difference: round2(totalDebit - totalCredit) };
}

export function entryTotalsUSD(entry: Pick<LedgerEntry, 'lines'>) {
  const debit = entry.lines.reduce((s, l) => s + l.debit * l.rate, 0);
  const credit = entry.lines.reduce((s, l) => s + l.credit * l.rate, 0);
  return { debit: round2(debit), credit: round2(credit) };
}

export function isBalanced(entry: Pick<LedgerEntry, 'lines'>) {
  const t = entryTotalsUSD(entry);
  return Math.abs(t.debit - t.credit) < EPSILON;
}

// ─── Building entries ────────────────────────────────────────────────────────

/** An error with a message in both languages, safe to show to the person. */
export class PostingError extends Error {
  en: string;
  ar: string;
  constructor(en: string, ar: string) {
    super(en);
    this.en = en;
    this.ar = ar;
  }
}

function line(account: Account, side: 'debit' | 'credit', amount: number, rate: number): LedgerLine {
  return {
    accountCode: account.code,
    debit: side === 'debit' ? round2(amount) : 0,
    credit: side === 'credit' ? round2(amount) : 0,
    currency: account.currency,
    rate,
  };
}

/** Side that makes an account's balance go up. */
const upSide = (a: Account): 'debit' | 'credit' => (DEBIT_NORMAL[a.category] ? 'debit' : 'credit');
const downSide = (a: Account): 'debit' | 'credit' => (DEBIT_NORMAL[a.category] ? 'credit' : 'debit');

/**
 * Move `amount` (in `from`'s currency) out of `from` and into `to`. Both accounts
 * must be on the same side (two money places, or two clients).
 * `toAmount` is what `to` receives in its own currency (defaults to today's rate).
 */
export function movement(
  from: Account, to: Account, amount: number, rates: Rates, toAmount?: number,
): LedgerLine[] {
  const fromRate = rates[from.currency] ?? 1;
  const usd = amount * fromRate;
  const received = toAmount && toAmount > 0 ? toAmount : usd / (rates[to.currency] ?? 1);
  const toRate = usd / received; // keeps the entry balanced at the agreed rate
  return [line(from, downSide(from), amount, fromRate), line(to, upSide(to), received, toRate)];
}

/** Debit one account and credit the other. `amount` is in `amountCurrencyAcc`'s currency. */
function pair(debitAcc: Account, creditAcc: Account, amount: number, amountCurrencyAcc: Account, rates: Rates, otherAmount?: number) {
  if (!(amount > 0)) throw new PostingError('The amount must be more than zero.', 'يجب أن يكون المبلغ أكبر من صفر.');
  const baseRate = rates[amountCurrencyAcc.currency] ?? 1;
  const usd = amount * baseRate;
  const other = amountCurrencyAcc === debitAcc ? creditAcc : debitAcc;
  const otherAmt = otherAmount && otherAmount > 0 ? otherAmount : usd / (rates[other.currency] ?? 1);
  const otherRate = usd / otherAmt;
  const debitAmt = debitAcc === amountCurrencyAcc ? amount : otherAmt;
  const creditAmt = creditAcc === amountCurrencyAcc ? amount : otherAmt;
  const debitRate = debitAcc === amountCurrencyAcc ? baseRate : otherRate;
  const creditRate = creditAcc === amountCurrencyAcc ? baseRate : otherRate;
  return [line(debitAcc, 'debit', debitAmt, debitRate), line(creditAcc, 'credit', creditAmt, creditRate)];
}

export function buildRequestLines(req: OperationRequest, accounts: Account[], rates: Rates): LedgerLine[] {
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const out: LedgerLine[] = [];
  for (const l of req.lines) {
    const acc = byCode.get(l.accountNo);
    const counter = l.counterAccountCode ? byCode.get(l.counterAccountCode) : undefined;
    if (!acc) throw new PostingError(`Account ${l.accountNo} was not found.`, `الحساب ${l.accountNo} غير موجود.`);
    if (!counter) {
      throw new PostingError(
        `Pick where the money goes in or out for ${acc.name}.`,
        `اختر من أين يدخل المال أو يخرج لـ ${acc.arabic || acc.name}.`,
      );
    }
    const received = l.receivedAmount && l.receivedAmount > 0
      ? l.receivedAmount
      : l.exchangeRate && l.exchangeRate > 0 ? l.amount * l.exchangeRate : undefined;
    switch (req.type) {
      case 'deposit':
      case 'ib_deposit':
        // Money comes in: the cash box / bank goes up, and we owe the client more.
        out.push(...pair(counter, acc, l.amount, acc, rates, received));
        break;
      case 'withdrawal':
      case 'ib_withdrawal':
        // Money goes out: we owe the client less, and the cash box / bank goes down.
        out.push(...pair(acc, counter, l.amount, acc, rates, received));
        break;
      case 'expense':
        out.push(...pair(acc, counter, l.amount, acc, rates, received));
        break;
      case 'transfer_from':
        out.push(...transfer(acc, counter, l.amount, rates, received));
        break;
      case 'transfer_to':
        out.push(...transfer(counter, acc, l.amount, rates, received, true));
        break;
    }
  }
  return out;
}

/** Move value between two accounts on the same side (bank → cash box, client → client). */
function transfer(from: Account, to: Account, amount: number, rates: Rates, received?: number, amountIsTo = false) {
  const sameSide = DEBIT_NORMAL[from.category] === DEBIT_NORMAL[to.category];
  if (!sameSide) {
    throw new PostingError(
      'You can only move money between two money places, or between two clients. Use "Add money" or "Take out money" instead.',
      'يمكنك نقل المال فقط بين مكانين للمال أو بين زبونين. استخدم "إضافة مال" أو "سحب مال" بدلًا من ذلك.',
    );
  }
  if (!(amount > 0)) throw new PostingError('The amount must be more than zero.', 'يجب أن يكون المبلغ أكبر من صفر.');
  if (amountIsTo) {
    // amount is in `to`'s currency
    const usd = amount * (rates[to.currency] ?? 1);
    const fromAmt = received ?? usd / (rates[from.currency] ?? 1);
    return [line(to, upSide(to), amount, rates[to.currency] ?? 1), line(from, downSide(from), fromAmt, usd / fromAmt)];
  }
  return movement(from, to, amount, rates, received);
}

export function requestTotalUSD(req: OperationRequest, rates: Rates) {
  return round2(req.lines.reduce((s, l) => s + toUSD(l.amount, l.currency as Currency, rates), 0));
}
