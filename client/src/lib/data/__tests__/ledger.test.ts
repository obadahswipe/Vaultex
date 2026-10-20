import { describe, expect, it } from 'vitest';
import { buildSeed } from '../seed';
import {
  balanceSheet, buildRequestLines, categoryTotals, computeBalances, isBalanced,
  PostingError, trialBalance, usdBalances,
} from '../ledger';
import { DEFAULT_RATES } from '../money';
import type { OperationRequest, RequestType } from '../types';

const seed = buildSeed();
const rates = { ...DEFAULT_RATES };

function request(type: RequestType, accountNo: string, counter: string | undefined, amount: number, extra: Partial<OperationRequest['lines'][number]> = {}): OperationRequest {
  return {
    id: 't', requestNo: 1, type, date: '2026-01-01', priority: 'normal', status: 'executed', createdBy: 'a', timeline: [],
    lines: [{ id: 'l', accountNo, amount, currency: seed.accounts.find((a) => a.code === accountNo)!.currency, counterAccountCode: counter, ...extra }],
  };
}

describe('sample data', () => {
  it('has only balanced entries', () => {
    expect(seed.entries.filter((e) => !isBalanced(e))).toEqual([]);
  });

  it('has a balanced trial balance and balance sheet', () => {
    const balances = computeBalances(seed.accounts, seed.entries);
    const usd = usdBalances(seed.accounts, balances, rates);
    const tb = trialBalance(seed.accounts, usd);
    expect(Math.abs(tb.difference)).toBeLessThan(0.05);
    expect(balanceSheet(categoryTotals(seed.accounts, usd)).balanced).toBe(true);
  });

  it('contains no real names from the old workbook', () => {
    const text = JSON.stringify(seed);
    for (const name of ['Dabbas', 'Qassar', 'Doumani', 'Darna', 'Klaho', 'Kilis']) expect(text).not.toContain(name);
  });
});

describe('building entries from money requests', () => {
  it('books a deposit: the bank goes up and so does what we owe the client', () => {
    const lines = buildRequestLines(request('deposit', '2101', '1201', 1000), seed.accounts, rates);
    expect(lines).toEqual([
      expect.objectContaining({ accountCode: '1201', debit: 1000, credit: 0 }),
      expect.objectContaining({ accountCode: '2101', debit: 0, credit: 1000 }),
    ]);
  });

  it('books a withdrawal the other way round', () => {
    const lines = buildRequestLines(request('withdrawal', '2101', '1201', 250), seed.accounts, rates);
    expect(lines[0]).toMatchObject({ accountCode: '2101', debit: 250 });
    expect(lines[1]).toMatchObject({ accountCode: '1201', credit: 250 });
  });

  it('balances a deposit paid in another currency at the agreed rate', () => {
    const lines = buildRequestLines(request('deposit', '2101', '1202', 1000, { exchangeRate: 45.5, receivedAmount: 45500 }), seed.accounts, rates);
    expect(lines[0]).toMatchObject({ accountCode: '1202', debit: 45500, currency: 'TRY' });
    expect(isBalanced({ lines })).toBe(true);
  });

  it('moves money between two banks', () => {
    const lines = buildRequestLines(request('transfer_from', '1201', '1203', 500), seed.accounts, rates);
    expect(lines[0]).toMatchObject({ accountCode: '1201', credit: 500 });
    expect(lines[1]).toMatchObject({ accountCode: '1203', debit: 500 });
  });

  it('refuses to "move" money from a bank to a client', () => {
    expect(() => buildRequestLines(request('transfer_from', '1201', '2101', 500), seed.accounts, rates)).toThrow(PostingError);
  });

  it('needs to know where the money goes', () => {
    expect(() => buildRequestLines(request('deposit', '2101', undefined, 500), seed.accounts, rates)).toThrow(PostingError);
  });

  it('refuses zero or negative amounts', () => {
    expect(() => buildRequestLines(request('deposit', '2101', '1201', 0), seed.accounts, rates)).toThrow(PostingError);
  });
});
