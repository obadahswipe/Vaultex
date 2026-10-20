// The one place where Vaultex keeps its data. Every page reads from here, so the
// dashboard, the reports, the client portal and the partner portal always agree.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildSeed, isoDay, SYMBOL_PRICES, type SeedData } from '@/lib/data/seed';
import {
  buildRequestLines, isBalanced, PostingError, entryTotalsUSD,
} from '@/lib/data/ledger';
import { round2, type Rates } from '@/lib/data/money';
import type {
  Account, AuditEvent, Branch, ClientRecord, Currency, Employee, EntryKind, FixedAsset,
  Gateway, IBRecord, Lead, LeaveRequest, LedgerEntry, LedgerLine, OperationRequest,
  OperationsSettings, Owner, RequestLine, StaffUser, SymbolSetting, Ticket, Wallet,
} from '@/lib/data/types';

export { PostingError };

export interface GeneralSettings {
  brokerName: string;
  timezone: string;
  defaultCurrency: Currency;
}

export interface BooksState extends SeedData {
  ops: OperationsSettings;
  general: GeneralSettings;
  actingAs: string;                 // email of the staff member using the app
  dismissedAlerts: string[];
  ratesUpdatedAt?: string;

  // who is working
  setActingAs: (email: string) => void;

  // money requests
  addRequest: (input: Omit<OperationRequest, 'id' | 'requestNo' | 'timeline' | 'status'>) => OperationRequest;
  confirmRequest: (id: string, by: string) => void;
  rejectRequest: (id: string, by: string, note?: string) => void;
  executeRequest: (id: string, by: string) => void;
  createVoucher: (id: string, by?: string) => LedgerEntry;
  updateRequestLines: (id: string, lines: RequestLine[]) => void;

  // ledger
  postEntry: (input: { date: string; memo: string; kind: EntryKind; lines: LedgerLine[]; ref?: string; by: string }) => LedgerEntry;
  reverseEntry: (id: string, by: string) => LedgerEntry;
  addAccount: (input: Omit<Account, 'active'> & { active?: boolean }) => void;
  updateAccount: (code: string, patch: Partial<Account>) => void;

  // clients & partners
  addClient: (input: Omit<ClientRecord, 'id' | 'accountNo'> & { currency?: Currency }) => ClientRecord;
  updateClient: (id: string, patch: Partial<ClientRecord>) => void;
  addIB: (input: Omit<IBRecord, 'id' | 'treeAccountCode'>) => IBRecord;
  updateIB: (id: string, patch: Partial<IBRecord>) => void;

  // trading
  refreshPrices: () => void;
  closeTrade: (id: string) => void;

  // end of day
  closeDay: (date: string, by: string) => { tradesBooked: number; partnerPay: number };

  // company
  runPayroll: (month: string, fromAccount: string, by: string) => void;
  addAsset: (input: Omit<FixedAsset, 'id' | 'monthsDepreciated' | 'active'>, paidFrom: string, by: string) => void;
  depreciateMonth: (by: string) => number;
  addCapital: (ownerId: string, amount: number, toAccount: string, by: string) => void;
  addOwner: (input: Omit<Owner, 'id' | 'capitalAccountCode'>) => void;
  addBranch: (input: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  addEmployee: (input: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  addLeave: (input: Omit<LeaveRequest, 'id' | 'status'>) => void;
  setLeaveStatus: (id: string, status: LeaveRequest['status']) => void;
  addLead: (input: Omit<Lead, 'id' | 'createdAt'>) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  convertLead: (id: string) => ClientRecord | undefined;
  addTicket: (input: Omit<Ticket, 'id' | 'createdAt'>) => void;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addWallet: (input: Omit<Wallet, 'id'>) => void;
  updateWallet: (id: string, patch: Partial<Wallet>) => void;
  addUser: (input: Omit<StaffUser, 'id'>) => void;
  updateUser: (id: string, patch: Partial<StaffUser>) => void;
  updateGateway: (id: string, patch: Partial<Gateway>) => void;
  addGateway: (input: Omit<Gateway, 'id'>) => void;
  updateSymbol: (symbol: string, patch: Partial<SymbolSetting>) => void;

  // settings & rates
  updateOps: (patch: Partial<OperationsSettings>) => void;
  updateGeneral: (patch: Partial<GeneralSettings>) => void;
  setRates: (patch: Partial<Rates>) => void;
  dismissAlert: (id: string) => void;

  resetDemo: () => void;
}

const DEFAULT_OPS: OperationsSettings = {
  requireDifferentConfirmer: true,
  manualMT5Execution: true,
  digitalWalletMode: false,
  urgentThresholdHours: 4,
  largeTransactionThreshold: 10000,
};

const DEFAULT_GENERAL: GeneralSettings = {
  brokerName: 'Demo Markets Ltd',
  timezone: 'Asia/Dubai',
  defaultCurrency: 'USD',
};

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

function freshState() {
  return {
    ...buildSeed(),
    ops: { ...DEFAULT_OPS },
    general: { ...DEFAULT_GENERAL },
    actingAs: 'admin@demo.com',
    dismissedAlerts: [] as string[],
    ratesUpdatedAt: undefined as string | undefined,
  };
}

// Older versions stored data (including real names) under these keys. Remove them.
const LEGACY_KEYS = ['fx-workbook', 'fx-operations', 'fx-clients', 'vaultex-settings'];
try { LEGACY_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* storage blocked */ }

export const useBooks = create<BooksState>()(
  persist(
    (set, get) => {
      const audit = (by: string, action: string, actionAr: string): AuditEvent =>
        ({ id: uid('au'), at: nowIso(), by, action, actionAr });

      const pushAudit = (ev: AuditEvent) => set((s) => ({ audit: [ev, ...s.audit].slice(0, 500) }));

      const nextAccountCode = (prefix: string) => {
        const nums = get().accounts.filter((a) => a.code.startsWith(prefix)).map((a) => Number(a.code)).filter(Number.isFinite);
        return String((nums.length ? Math.max(...nums) : Number(prefix + '00')) + 1);
      };

      const lineFor = (code: string, side: 'debit' | 'credit', usdAmount: number): LedgerLine => {
        const acc = get().accounts.find((a) => a.code === code);
        if (!acc) throw new PostingError(`Account ${code} was not found.`, `الحساب ${code} غير موجود.`);
        const rate = get().rates[acc.currency] ?? 1;
        const amt = round2(usdAmount / rate);
        return { accountCode: code, debit: side === 'debit' ? amt : 0, credit: side === 'credit' ? amt : 0, currency: acc.currency, rate };
      };

      const postEntry: BooksState['postEntry'] = ({ date, memo, kind, lines, ref, by }) => {
        const s = get();
        if (date <= s.closedThrough) {
          throw new PostingError(
            `The day ${date} is already closed. Pick a later date.`,
            `يوم ${date} مغلق. اختر تاريخًا لاحقًا.`,
          );
        }
        const clean = lines.filter((l) => l.debit > 0 || l.credit > 0);
        if (clean.length < 2) throw new PostingError('An entry needs at least two lines.', 'القيد يحتاج سطرين على الأقل.');
        for (const l of clean) {
          const acc = s.accounts.find((a) => a.code === l.accountCode);
          if (!acc) throw new PostingError(`Account ${l.accountCode} was not found.`, `الحساب ${l.accountCode} غير موجود.`);
          if (!acc.active) throw new PostingError(`${acc.name} is turned off.`, `الحساب ${acc.arabic} متوقف.`);
          if (acc.currency !== l.currency) {
            throw new PostingError(`${acc.name} uses ${acc.currency}, not ${l.currency}.`, `الحساب ${acc.arabic} بعملة ${acc.currency} وليس ${l.currency}.`);
          }
        }
        const entry: LedgerEntry = {
          id: uid('je'), no: s.nextEntryNo, date, memo, kind, ref, lines: clean, createdBy: by, createdAt: nowIso(),
        };
        if (!isBalanced(entry)) {
          const t = entryTotalsUSD(entry);
          throw new PostingError(
            `This entry does not balance. Money in: $${t.debit}, money out: $${t.credit}.`,
            `هذا القيد غير متوازن. المدين: ${t.debit}$، الدائن: ${t.credit}$.`,
          );
        }
        set((st) => ({ entries: [...st.entries, entry], nextEntryNo: st.nextEntryNo + 1 }));
        return entry;
      };

      const today = () => isoDay(new Date());

      return {
        ...freshState(),

        setActingAs: (email) => set({ actingAs: email }),

        // ── Money requests ────────────────────────────────────────────────
        addRequest: (input) => {
          const s = get();
          const req: OperationRequest = {
            ...input,
            source: input.source ?? 'staff',
            id: uid('req'),
            requestNo: s.nextRequestNo,
            status: 'pending',
            timeline: [{ action: 'created', by: input.createdBy, at: nowIso() }],
          };
          set((st) => ({ requests: [req, ...st.requests], nextRequestNo: st.nextRequestNo + 1 }));
          pushAudit(audit(input.createdBy, `Made money request #${req.requestNo}`, `أنشأ طلب المال رقم ${req.requestNo}`));
          return req;
        },

        confirmRequest: (id, by) => {
          const s = get();
          const req = s.requests.find((r) => r.id === id);
          if (!req || req.status !== 'pending') return;
          if (s.ops.requireDifferentConfirmer && req.createdBy === by) {
            throw new PostingError(
              'You made this request, so a different person must say OK.',
              'أنت من أنشأ هذا الطلب، لذلك يجب أن يوافق عليه شخص آخر.',
            );
          }
          set((st) => ({
            requests: st.requests.map((r) => r.id === id
              ? { ...r, status: 'confirmed', confirmedBy: by, timeline: [...r.timeline, { action: 'confirmed', by, at: nowIso() }] }
              : r),
          }));
          pushAudit(audit(by, `Said OK to request #${req.requestNo}`, `وافق على الطلب رقم ${req.requestNo}`));
        },

        rejectRequest: (id, by, note) => {
          const req = get().requests.find((r) => r.id === id);
          if (!req || (req.status !== 'pending' && req.status !== 'confirmed')) return;
          set((st) => ({
            requests: st.requests.map((r) => r.id === id
              ? { ...r, status: 'rejected', rejectedBy: by, timeline: [...r.timeline, { action: 'rejected', by, at: nowIso(), note }] }
              : r),
          }));
          pushAudit(audit(by, `Said no to request #${req.requestNo}`, `رفض الطلب رقم ${req.requestNo}`));
        },

        executeRequest: (id, by) => {
          const s = get();
          const req = s.requests.find((r) => r.id === id);
          if (!req || req.status !== 'confirmed') return;
          // The money now moves on MT5 too.
          const mt5 = { ...s.mt5Balances };
          for (const l of req.lines) {
            if (mt5[l.accountNo] === undefined) continue;
            const sign = req.type === 'deposit' || req.type === 'transfer_to' ? 1 : req.type === 'withdrawal' || req.type === 'transfer_from' ? -1 : 0;
            mt5[l.accountNo] = round2(mt5[l.accountNo] + sign * l.amount);
            if (l.counterAccountCode && mt5[l.counterAccountCode] !== undefined) {
              if (req.type === 'transfer_from') mt5[l.counterAccountCode] = round2(mt5[l.counterAccountCode] + l.amount);
              if (req.type === 'transfer_to') mt5[l.counterAccountCode] = round2(mt5[l.counterAccountCode] - l.amount);
            }
          }
          set((st) => ({
            mt5Balances: mt5,
            requests: st.requests.map((r) => r.id === id
              ? { ...r, status: 'executed', executedBy: by, timeline: [...r.timeline, { action: 'executed', by, at: nowIso() }] }
              : r),
          }));
          pushAudit(audit(by, `Sent the money for request #${req.requestNo}`, `نفّذ تحويل المال للطلب رقم ${req.requestNo}`));
        },

        createVoucher: (id, by) => {
          const s = get();
          const req = s.requests.find((r) => r.id === id);
          if (!req) throw new PostingError('Request not found.', 'الطلب غير موجود.');
          if (req.status !== 'executed') throw new PostingError('Send the money first, then write it in the books.', 'نفّذ التحويل أولًا، ثم سجّله في الدفاتر.');
          const who = by ?? s.actingAs;
          const lines = buildRequestLines(req, s.accounts, s.rates);
          const kind: EntryKind = req.type === 'deposit' || req.type === 'ib_deposit' ? 'deposit'
            : req.type === 'expense' ? 'expense'
            : req.type === 'ib_withdrawal' ? 'ib_payout'
            : req.type === 'withdrawal' ? 'withdrawal' : 'transfer';
          const names = req.lines.map((l) => l.accountName ?? l.accountNo).join(', ');
          const memo = `Request #${req.requestNo} · ${names}${req.note ? ` · ${req.note}` : ''}`;
          const date = req.date > s.closedThrough ? req.date : today();
          const entry = postEntry({ date, memo, kind, lines, ref: req.id, by: who });
          set((st) => ({
            requests: st.requests.map((r) => r.id === id
              ? { ...r, status: 'voucher', voucherRef: `V-${entry.no}`, entryId: entry.id, timeline: [...r.timeline, { action: 'voucher', by: who, at: nowIso() }] }
              : r),
          }));
          pushAudit(audit(who, `Wrote request #${req.requestNo} in the books (voucher ${entry.no})`, `سجّل الطلب رقم ${req.requestNo} في الدفاتر (سند ${entry.no})`));
          return entry;
        },

        updateRequestLines: (id, lines) =>
          set((s) => ({ requests: s.requests.map((r) => (r.id === id && r.status === 'pending' ? { ...r, lines } : r)) })),

        // ── Ledger ────────────────────────────────────────────────────────
        postEntry: (input) => {
          const e = postEntry(input);
          pushAudit(audit(input.by, `Wrote entry ${e.no}: ${e.memo}`, `سجّل القيد ${e.no}: ${e.memo}`));
          return e;
        },

        reverseEntry: (id, by) => {
          const s = get();
          const orig = s.entries.find((e) => e.id === id);
          if (!orig) throw new PostingError('Entry not found.', 'القيد غير موجود.');
          if (s.entries.some((e) => e.ref === `reverse:${orig.id}`)) {
            throw new PostingError('This entry was already undone.', 'تم التراجع عن هذا القيد من قبل.');
          }
          const e = postEntry({
            date: today(),
            memo: `Undo entry ${orig.no}: ${orig.memo}`,
            kind: 'manual',
            ref: `reverse:${orig.id}`,
            lines: orig.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
            by,
          });
          pushAudit(audit(by, `Undid entry ${orig.no}`, `تراجع عن القيد ${orig.no}`));
          return e;
        },

        addAccount: (input) => {
          if (get().accounts.some((a) => a.code === input.code)) {
            throw new PostingError(`Account number ${input.code} is already used.`, `رقم الحساب ${input.code} مستخدم من قبل.`);
          }
          set((s) => ({ accounts: [...s.accounts, { active: true, ...input }] }));
        },

        updateAccount: (code, patch) =>
          set((s) => ({ accounts: s.accounts.map((a) => (a.code === code ? { ...a, ...patch, code: a.code } : a)) })),

        // ── Clients & partners ────────────────────────────────────────────
        addClient: (input) => {
          const code = nextAccountCode('21');
          const { currency = 'USD', ...rest } = input;
          const client: ClientRecord = { ...rest, id: uid('cl'), accountNo: code, mt5Login: rest.mt5Login ?? String(500100 + get().clients.length) };
          set((s) => ({
            accounts: [...s.accounts, { code, name: client.name, arabic: client.arabic || client.name, category: 'clients', currency, opening: 0, active: true, creditLimit: client.creditLimit }],
            clients: [...s.clients, client],
            mt5Balances: { ...s.mt5Balances, [code]: 0 },
            ibs: client.ibParentId ? s.ibs.map((ib) => ib.id === client.ibParentId ? { ...ib, linkedClientIds: [...ib.linkedClientIds, client.id] } : ib) : s.ibs,
          }));
          pushAudit(audit(get().actingAs, `Added client ${client.name}`, `أضاف الزبون ${client.arabic || client.name}`));
          return client;
        },

        updateClient: (id, patch) => {
          const before = get().clients.find((c) => c.id === id);
          set((s) => ({
            clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            accounts: before && (patch.name || patch.arabic || patch.creditLimit !== undefined || patch.active !== undefined)
              ? s.accounts.map((a) => a.code === before.accountNo ? {
                  ...a,
                  name: patch.name ?? a.name,
                  arabic: patch.arabic ?? a.arabic,
                  creditLimit: patch.creditLimit ?? a.creditLimit,
                } : a)
              : s.accounts,
            ibs: before && patch.ibParentId !== undefined && patch.ibParentId !== before.ibParentId
              ? s.ibs.map((ib) => ({
                  ...ib,
                  linkedClientIds: ib.id === patch.ibParentId
                    ? [...new Set([...ib.linkedClientIds, id])]
                    : ib.linkedClientIds.filter((cid) => cid !== id),
                }))
              : s.ibs,
          }));
        },

        addIB: (input) => {
          const code = nextAccountCode('22');
          const ib: IBRecord = { ...input, id: uid('ib'), treeAccountCode: code };
          set((s) => ({
            accounts: [...s.accounts, { code, name: `Partner: ${ib.name}`, arabic: `شريك: ${ib.arabic || ib.name}`, category: 'ibs', currency: 'USD', opening: 0, active: true }],
            ibs: [...s.ibs, ib],
          }));
          pushAudit(audit(get().actingAs, `Added partner ${ib.name}`, `أضاف الشريك ${ib.arabic || ib.name}`));
          return ib;
        },

        updateIB: (id, patch) => set((s) => ({ ibs: s.ibs.map((ib) => (ib.id === id ? { ...ib, ...patch } : ib)) })),

        // ── Trading ───────────────────────────────────────────────────────
        refreshPrices: () => {
          set((s) => ({
            trades: s.trades.map((t) => {
              if (t.status !== 'open') return t;
              const sp = SYMBOL_PRICES[t.symbol];
              const drift = 1 + (Math.random() - 0.5) * 0.0016;
              const currentPrice = +(t.currentPrice * drift).toFixed(t.symbol === 'USDJPY' ? 3 : 5);
              let profit = (t.side === 'buy' ? currentPrice - t.openPrice : t.openPrice - currentPrice) * t.lots * (sp?.contract ?? 1);
              if (t.symbol === 'USDJPY') profit /= currentPrice;
              return { ...t, currentPrice, profit: round2(profit) };
            }),
          }));
        },

        closeTrade: (id) => {
          const s = get();
          const t = s.trades.find((x) => x.id === id);
          if (!t || t.status !== 'open') return;
          const client = s.clients.find((c) => c.id === t.clientId);
          set((st) => ({
            trades: st.trades.map((x) => x.id === id ? { ...x, status: 'closed', closePrice: x.currentPrice, closedAt: nowIso() } : x),
            mt5Balances: client
              ? { ...st.mt5Balances, [client.accountNo]: round2((st.mt5Balances[client.accountNo] ?? 0) + t.profit - t.commission) }
              : st.mt5Balances,
          }));
          pushAudit(audit(s.actingAs, `Closed trade ${t.ticket}`, `أغلق الصفقة ${t.ticket}`));
        },

        // ── End of day ────────────────────────────────────────────────────
        closeDay: (date, by) => {
          const s = get();
          if (date <= s.closedThrough) {
            throw new PostingError(`The day ${date} is already closed.`, `يوم ${date} مغلق من قبل.`);
          }
          const waiting = s.requests.filter((r) => r.date <= date && (r.status === 'confirmed' || r.status === 'executed'));
          if (waiting.length) {
            throw new PostingError(
              `Finish ${waiting.length} money request(s) first. They were said OK but are not in the books yet.`,
              `أكمل ${waiting.length} من طلبات المال أولًا. تمت الموافقة عليها لكنها لم تُسجّل في الدفاتر بعد.`,
            );
          }
          const clientById = new Map(s.clients.map((c) => [c.id, c]));
          const ibById = new Map(s.ibs.map((i) => [i.id, i]));
          const toBook = s.trades.filter((t) => t.status === 'closed' && !s.postedTradeIds.includes(t.id) && (t.closedAt ?? '').slice(0, 10) <= date);
          let partnerPay = 0;
          // Book with a date one tick after the last closed day so it is allowed.
          if (toBook.length) {
            const lines: LedgerLine[] = [];
            let bNet = 0; let aNet = 0; let fees = 0; let spread = 0;
            const ibPay: Record<string, number> = {};
            for (const t of toBook) {
              const c = clientById.get(t.clientId);
              if (!c) continue;
              const net = round2(t.profit - t.commission);
              if (net > 0) lines.push(lineFor(c.accountNo, 'credit', net));
              else if (net < 0) lines.push(lineFor(c.accountNo, 'debit', -net));
              fees += t.commission;
              if (t.book === 'B') bNet += t.profit; else { aNet += t.profit; spread += t.lots * 6; }
              if (c.ibParentId) {
                const ib = ibById.get(c.ibParentId);
                if (ib) ibPay[ib.treeAccountCode] = (ibPay[ib.treeAccountCode] ?? 0) + t.lots * ib.commissionRate;
              }
            }
            aNet = round2(aNet); bNet = round2(bNet);
            if (aNet > 0) lines.push(lineFor('1301', 'debit', aNet)); else if (aNet < 0) lines.push(lineFor('1301', 'credit', -aNet));
            if (bNet > 0) lines.push(lineFor('4103', 'debit', bNet)); else if (bNet < 0) lines.push(lineFor('4103', 'credit', -bNet));
            if (fees > 0) lines.push(lineFor('4102', 'credit', round2(fees)));
            if (spread > 0) { lines.push(lineFor('1301', 'debit', round2(spread))); lines.push(lineFor('4101', 'credit', round2(spread))); }
            postEntry({ date, memo: 'Trading results for the day', kind: 'trade_pnl', lines, ref: `eod-${date}`, by });
            const ibLines = Object.entries(ibPay).map(([code, amt]) => lineFor(code, 'credit', round2(amt)));
            partnerPay = round2(ibLines.reduce((sum, l) => sum + l.credit, 0));
            if (partnerPay > 0) {
              postEntry({ date, memo: 'Partner (IB) pay for the day', kind: 'ib_commission', lines: [lineFor('5103', 'debit', partnerPay), ...ibLines], ref: `eod-${date}`, by });
            }
          }
          set((st) => ({
            closedThrough: date,
            postedTradeIds: [...st.postedTradeIds, ...toBook.map((t) => t.id)],
          }));
          pushAudit(audit(by, `Closed the day ${date}`, `أغلق يوم ${date}`));
          return { tradesBooked: toBook.length, partnerPay };
        },

        // ── Company ───────────────────────────────────────────────────────
        runPayroll: (month, fromAccount, by) => {
          const s = get();
          if (s.payrolls.some((p) => p.month === month)) {
            throw new PostingError(`Salaries for ${month} were already paid.`, `تم دفع رواتب ${month} من قبل.`);
          }
          const total = s.employees.filter((e) => e.active).reduce((sum, e) => sum + e.salary, 0);
          const e = postEntry({
            date: today(), memo: `Salaries for ${month}`, kind: 'payroll', ref: `payroll-${month}`, by,
            lines: [lineFor('5101', 'debit', total), lineFor(fromAccount, 'credit', total)],
          });
          set((st) => ({ payrolls: [...st.payrolls, { id: uid('pay'), month, total, paidFrom: fromAccount, entryId: e.id, createdAt: e.createdAt }] }));
          pushAudit(audit(by, `Paid salaries for ${month}`, `دفع رواتب ${month}`));
        },

        addAsset: (input, paidFrom, by) => {
          const target = input.kind === 'furniture' || input.kind === 'office' ? '1502' : '1501';
          postEntry({
            date: today(), memo: `Bought ${input.name}`, kind: 'asset_buy', by,
            lines: [lineFor(target, 'debit', input.cost), lineFor(paidFrom, 'credit', input.cost)],
          });
          set((s) => ({ assets: [...s.assets, { ...input, id: uid('as'), monthsDepreciated: 0, active: true }] }));
        },

        depreciateMonth: (by) => {
          const s = get();
          const items = s.assets.filter((a) => a.active && a.monthsDepreciated < a.lifeMonths);
          const total = round2(items.reduce((sum, a) => sum + a.cost / a.lifeMonths, 0));
          if (total <= 0) return 0;
          postEntry({
            date: today(), memo: 'Wear and tear for the month', kind: 'depreciation', by,
            lines: [lineFor('5107', 'debit', total), lineFor('1509', 'credit', total)],
          });
          set((st) => ({
            assets: st.assets.map((a) => (items.includes(a) ? { ...a, monthsDepreciated: a.monthsDepreciated + 1 } : a)),
          }));
          return total;
        },

        addCapital: (ownerId, amount, toAccount, by) => {
          const owner = get().owners.find((o) => o.id === ownerId);
          if (!owner) return;
          postEntry({
            date: today(), memo: `${owner.name} put money into the company`, kind: 'capital', by,
            lines: [lineFor(toAccount, 'debit', amount), lineFor(owner.capitalAccountCode, 'credit', amount)],
          });
        },

        addOwner: (input) => {
          const code = nextAccountCode('31');
          set((s) => ({
            accounts: [...s.accounts, { code, name: `Owner money: ${input.name}`, arabic: `مال المالك: ${input.arabic || input.name}`, category: 'partners', currency: 'USD', opening: 0, active: true }],
            owners: [...s.owners, { ...input, id: uid('own'), capitalAccountCode: code }],
          }));
        },

        addBranch: (input) => set((s) => ({ branches: [...s.branches, { ...input, id: uid('br') }] })),
        updateBranch: (id, patch) => set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
        addEmployee: (input) => set((s) => ({ employees: [...s.employees, { ...input, id: uid('emp') }] })),
        updateEmployee: (id, patch) => set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
        addLeave: (input) => set((s) => ({ leaves: [{ ...input, id: uid('lv'), status: 'pending' }, ...s.leaves] })),
        setLeaveStatus: (id, status) => {
          const s = get();
          const lv = s.leaves.find((l) => l.id === id);
          if (!lv || lv.status === status) return;
          const days = Math.max(1, Math.round((new Date(lv.to).getTime() - new Date(lv.from).getTime()) / 86_400_000) + 1);
          set((st) => ({
            leaves: st.leaves.map((l) => (l.id === id ? { ...l, status } : l)),
            employees: status === 'approved'
              ? st.employees.map((e) => (e.id === lv.employeeId ? { ...e, leaveDaysLeft: Math.max(0, e.leaveDaysLeft - days) } : e))
              : st.employees,
          }));
        },
        addLead: (input) => set((s) => ({ leads: [{ ...input, id: uid('ld'), createdAt: today() }, ...s.leads] })),
        updateLead: (id, patch) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
        convertLead: (id) => {
          const lead = get().leads.find((l) => l.id === id);
          if (!lead) return undefined;
          const client = get().addClient({
            name: lead.name, arabic: lead.name, email: lead.email, phone: lead.phone, country: lead.country,
            classification: 'neutral', active: true, joinDate: today(), kycStatus: 'pending',
          });
          set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, stage: 'won' } : l)) }));
          return client;
        },
        addTicket: (input) => set((s) => ({ tickets: [{ ...input, id: uid('tk'), createdAt: nowIso() }, ...s.tickets] })),
        updateTicket: (id, patch) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        addWallet: (input) => set((s) => ({ wallets: [...s.wallets, { ...input, id: uid('wl') }] })),
        updateWallet: (id, patch) => set((s) => ({ wallets: s.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
        addUser: (input) => {
          if (get().users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
            throw new PostingError('Someone already uses this email.', 'هذا البريد مستخدم من قبل.');
          }
          set((s) => ({ users: [...s.users, { ...input, id: uid('u') }] }));
        },
        updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
        updateGateway: (id, patch) => set((s) => ({ gateways: s.gateways.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
        addGateway: (input) => set((s) => ({ gateways: [...s.gateways, { ...input, id: uid('gw') }] })),
        updateSymbol: (symbol, patch) => set((s) => ({ symbols: s.symbols.map((x) => (x.symbol === symbol ? { ...x, ...patch } : x)) })),

        // ── Settings & rates ──────────────────────────────────────────────
        updateOps: (patch) => set((s) => ({ ops: { ...s.ops, ...patch } })),
        updateGeneral: (patch) => set((s) => ({ general: { ...s.general, ...patch } })),
        setRates: (patch) => {
          const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v === 'number' && v > 0 && Number.isFinite(v)));
          if (!Object.keys(clean).length) return;
          const day = today();
          set((s) => {
            const history = s.rateHistory.filter((h) => h.date !== day);
            return {
              rates: { ...s.rates, ...clean, USD: 1, USDT: 1 },
              ratesUpdatedAt: nowIso(),
              rateHistory: [...history, { date: day, rates: { ...(s.rateHistory.find((h) => h.date === day)?.rates ?? {}), ...clean } }].slice(-120),
            };
          });
        },
        dismissAlert: (id) => set((s) => ({ dismissedAlerts: [...new Set([...s.dismissedAlerts, id])] })),

        resetDemo: () => set({ ...freshState() }),
      };
    },
    {
      name: 'vaultex-data',
      // Bump this when the sample data changes shape; older saved data is replaced.
      version: 2,
      partialize: (s) => {
        const { requests, ...rest } = s;
        const data: Partial<BooksState> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') (data as Record<string, unknown>)[k] = v;
        data.requests = requests.map((r) => ({ ...r, attachmentBase64: undefined }));
        return data as BooksState;
      },
      migrate: () => freshState() as unknown as BooksState,
    },
  ),
);
