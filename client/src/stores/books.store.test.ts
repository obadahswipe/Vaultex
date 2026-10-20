import { beforeEach, describe, expect, it } from 'vitest';
import { useBooks, PostingError } from './books.store';
import { computeBalances, isBalanced } from '@/lib/data/ledger';

const today = new Date().toISOString().slice(0, 10);
const store = () => useBooks.getState();

function newDeposit(by = 'omar@demo.com') {
  return store().addRequest({
    type: 'deposit', date: today, priority: 'normal', createdBy: by,
    lines: [{ id: 'l1', accountNo: '2101', accountName: 'Sami Haddad', amount: 1000, currency: 'USD', counterAccountCode: '1201' }],
  });
}

describe('money requests', () => {
  beforeEach(() => store().resetDemo());

  it('needs a different person to say OK', () => {
    const req = newDeposit('admin@demo.com');
    expect(() => store().confirmRequest(req.id, 'admin@demo.com')).toThrow(PostingError);
    store().confirmRequest(req.id, 'rania@demo.com');
    expect(store().requests.find((r) => r.id === req.id)?.status).toBe('confirmed');
  });

  it('goes through every step and changes the right balances', () => {
    const before = computeBalances(store().accounts, store().entries);
    const mt5Before = store().mt5Balances['2101'];
    const req = newDeposit();
    store().confirmRequest(req.id, 'admin@demo.com');
    store().executeRequest(req.id, 'wael@demo.com');
    expect(store().mt5Balances['2101']).toBe(mt5Before + 1000);
    const entry = store().createVoucher(req.id, 'admin@demo.com');
    expect(isBalanced(entry)).toBe(true);
    const after = computeBalances(store().accounts, store().entries);
    expect(after['2101'] - before['2101']).toBeCloseTo(1000);
    expect(after['1201'] - before['1201']).toBeCloseTo(1000);
    expect(store().requests.find((r) => r.id === req.id)?.timeline.map((t) => t.action)).toEqual(['created', 'confirmed', 'executed', 'voucher']);
  });

  it('cannot write a request in the books before the money is sent', () => {
    const req = newDeposit();
    store().confirmRequest(req.id, 'admin@demo.com');
    expect(() => store().createVoucher(req.id)).toThrow(PostingError);
  });
});

describe('the books', () => {
  beforeEach(() => store().resetDemo());

  it('refuses entries that do not balance', () => {
    expect(() => store().postEntry({
      date: today, memo: 'bad', kind: 'manual', by: 'admin@demo.com',
      lines: [
        { accountCode: '1201', debit: 100, credit: 0, currency: 'USD', rate: 1 },
        { accountCode: '4105', debit: 0, credit: 90, currency: 'USD', rate: 1 },
      ],
    })).toThrow(PostingError);
  });

  it('refuses entries on a closed day', () => {
    expect(() => store().postEntry({
      date: store().closedThrough, memo: 'late', kind: 'manual', by: 'admin@demo.com',
      lines: [
        { accountCode: '1201', debit: 100, credit: 0, currency: 'USD', rate: 1 },
        { accountCode: '4105', debit: 0, credit: 100, currency: 'USD', rate: 1 },
      ],
    })).toThrow(PostingError);
  });

  it('undoes an entry with a new one instead of deleting it', () => {
    const balanceOf4105 = () => computeBalances(store().accounts, store().entries)['4105'];
    const start = balanceOf4105();
    const e = store().postEntry({
      date: today, memo: 'oops', kind: 'manual', by: 'admin@demo.com',
      lines: [
        { accountCode: '1201', debit: 100, credit: 0, currency: 'USD', rate: 1 },
        { accountCode: '4105', debit: 0, credit: 100, currency: 'USD', rate: 1 },
      ],
    });
    expect(balanceOf4105()).toBeCloseTo(start + 100);
    const count = store().entries.length;
    store().reverseEntry(e.id, 'admin@demo.com');
    expect(store().entries.length).toBe(count + 1);
    expect(balanceOf4105()).toBeCloseTo(start);
    expect(() => store().reverseEntry(e.id, 'admin@demo.com')).toThrow(PostingError);
  });

  it('closes the day only when every request with an OK is finished', () => {
    // The sample data has unfinished requests for today.
    expect(() => store().closeDay(today, 'rania@demo.com')).toThrow(PostingError);
    for (const r of store().requests.filter((x) => x.status === 'confirmed')) store().executeRequest(r.id, 'wael@demo.com');
    for (const r of store().requests.filter((x) => x.status === 'executed')) store().createVoucher(r.id, 'rania@demo.com');
    const result = store().closeDay(today, 'rania@demo.com');
    expect(result.tradesBooked).toBeGreaterThan(0);
    expect(store().closedThrough).toBe(today);
    expect(store().entries.every(isBalanced)).toBe(true);
  });
});
