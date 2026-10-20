// Sample company used by the demo. Every name and number here is made up.
// Dates are relative to "today" so the demo always looks fresh.
import type {
  Account, Branch, ClientRecord, Employee, FixedAsset, Gateway, IBRecord, Lead,
  LeaveRequest, LedgerEntry, OperationRequest, Owner, PayrollRun, RequestType,
  StaffUser, SymbolSetting, Ticket, Trade, Wallet, AuditEvent, Currency, EntryKind, LedgerLine,
} from './types';
import { DEFAULT_RATES, round2, toUSD, type Rates } from './money';
import { buildRequestLines } from './ledger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function daysAgo(n: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return isoDay(d);
}
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000 - 7 * 60_000).toISOString();
const at = (day: string, hour: number, minute = 0) =>
  `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;

// ─── Accounts ────────────────────────────────────────────────────────────────

const A = (
  code: string, name: string, arabic: string, category: Account['category'],
  currency: Currency, opening: number, extra: Partial<Account> = {},
): Account => ({ code, name, arabic, category, currency, opening, active: true, ...extra });

const baseAccounts: Account[] = [
  // Cash boxes
  A('1101', 'Main office safe (USD)', 'خزنة المكتب الرئيسي (دولار)', 'funds', 'USD', 48500, { branchId: 'br-1' }),
  A('1102', 'Main office safe (AED)', 'خزنة المكتب الرئيسي (درهم)', 'funds', 'AED', 65000, { branchId: 'br-1' }),
  A('1103', 'Istanbul cash (TRY)', 'صندوق إسطنبول (ليرة)', 'funds', 'TRY', 410000, { branchId: 'br-2' }),
  A('1104', 'Istanbul cash (USD)', 'صندوق إسطنبول (دولار)', 'funds', 'USD', 12300, { branchId: 'br-2' }),
  A('1105', 'Amman cash (USD)', 'صندوق عمّان (دولار)', 'funds', 'USD', 7900, { branchId: 'br-3' }),
  A('1106', 'Euro cash box', 'صندوق اليورو', 'funds', 'EUR', 6200, { branchId: 'br-1' }),
  A('1107', 'USDT wallet', 'محفظة USDT', 'funds', 'USDT', 23900),
  // Banks
  A('1201', 'Atlas Bank (USD)', 'بنك أطلس (دولار)', 'banks', 'USD', 185000),
  A('1202', 'Atlas Bank (TRY)', 'بنك أطلس (ليرة)', 'banks', 'TRY', 950000),
  A('1203', 'Harbor Bank (USD)', 'بنك هاربر (دولار)', 'banks', 'USD', 92000),
  A('1204', 'Cedar Bank (AED)', 'بنك سيدار (درهم)', 'banks', 'AED', 220000),
  A('1205', 'Cedar Bank (EUR)', 'بنك سيدار (يورو)', 'banks', 'EUR', 18000),
  // Money partners
  A('1301', 'Prime Liquidity (trading partner)', 'برايم للسيولة (شريك التداول)', 'suppliers', 'USD', 150000, { system: true }),
  A('1302', 'Falcon Money Transfer', 'فالكون للحوالات', 'suppliers', 'USD', 15000),
  A('1303', 'Swift Exchange House', 'دار سويفت للصرافة', 'suppliers', 'USD', 4200),
  // Staff loans
  A('1401', 'Loan to Omar Fakhoury', 'سلفة عمر فاخوري', 'staff', 'USD', 1200),
  A('1402', 'Loan to Rania Odeh', 'سلفة رانيا عودة', 'staff', 'USD', 600),
  // Things we own
  A('1501', 'Computers and screens', 'حواسيب وشاشات', 'fixed', 'USD', 14000, { system: true }),
  A('1502', 'Office furniture', 'أثاث المكتب', 'fixed', 'USD', 9000),
  A('1509', 'Wear and tear so far', 'الاستهلاك المتراكم', 'fixed', 'USD', -3000, { system: true }),
  // Partners (IBs) — what we owe them
  A('2201', 'Partner: Gulf Star', 'شريك: نجمة الخليج', 'ibs', 'USD', 1820),
  A('2202', 'Partner: Anatolia Network', 'شريك: شبكة الأناضول', 'ibs', 'USD', 650),
  A('2203', 'Partner: Levant Traders', 'شريك: تجار الشام', 'ibs', 'USD', 320),
  // Bills
  A('2301', 'Taxes to pay', 'ضرائب مستحقة', 'debts', 'USD', 3200, { system: true }),
  A('2302', 'Bills to pay', 'فواتير مستحقة', 'debts', 'USD', 1850),
  A('2303', 'Salaries to pay', 'رواتب مستحقة', 'debts', 'USD', 0, { system: true }),
  // Owners
  A('3101', 'Owner money: Adam Saad', 'مال المالك: آدم سعد', 'partners', 'USD', 180000, { system: true }),
  A('3102', 'Owner money: Jana Barakat', 'مال الشريكة: جنى بركات', 'partners', 'USD', 120000, { system: true }),
  A('3103', 'Profit kept from past years', 'أرباح السنوات السابقة', 'partners', 'USD', 0, { system: true }),
  // Money we earn
  A('4101', 'Spread income', 'دخل فرق السعر (السبريد)', 'revenue', 'USD', 0, { system: true }),
  A('4102', 'Trading fees from clients', 'رسوم التداول من الزبائن', 'revenue', 'USD', 0, { system: true }),
  A('4103', 'Client trading results', 'نتائج تداول الزبائن', 'revenue', 'USD', 0, { system: true }),
  A('4104', 'Money exchange income', 'دخل الصرافة', 'revenue', 'USD', 0, { system: true }),
  A('4105', 'Other income', 'دخل آخر', 'revenue', 'USD', 0),
  // Money we spend
  A('5101', 'Salaries', 'الرواتب', 'expenses', 'USD', 0, { system: true }),
  A('5102', 'Office rent', 'إيجار المكتب', 'expenses', 'USD', 0),
  A('5103', 'Partner (IB) pay', 'أجور الشركاء (الوكلاء)', 'expenses', 'USD', 0, { system: true }),
  A('5104', 'Bank and transfer fees', 'رسوم البنوك والحوالات', 'expenses', 'USD', 0),
  A('5105', 'Internet and software', 'الإنترنت والبرامج', 'expenses', 'USD', 0),
  A('5106', 'Marketing', 'التسويق', 'expenses', 'USD', 0),
  A('5107', 'Wear and tear', 'استهلاك الأصول', 'expenses', 'USD', 0, { system: true }),
  A('5108', 'Gifts and compensation', 'هدايا وتعويضات', 'expenses', 'USD', 0),
  A('5109', 'Other costs', 'مصاريف أخرى', 'expenses', 'USD', 0),
];

interface ClientSeed { name: string; arabic: string; country: string; balance: number; currency?: Currency; ib?: string; cls?: ClientRecord['classification']; limit?: number; kyc?: ClientRecord['kycStatus'] }

const clientSeeds: ClientSeed[] = [
  { name: 'Sami Haddad',        arabic: 'سامي حداد',          country: 'Jordan',  balance: 18400, ib: 'ib-1' },
  { name: 'Lina Khoury',        arabic: 'لينا خوري',          country: 'Lebanon', balance: 9250,  ib: 'ib-1' },
  { name: 'Rana Saleh',         arabic: 'رنا صالح',           country: 'UAE',     balance: 42100 },
  { name: 'Karim Fares',        arabic: 'كريم فارس',          country: 'Turkey',  balance: 6300,  ib: 'ib-2' },
  { name: 'Huda Mansour',       arabic: 'هدى منصور',          country: 'Jordan',  balance: 15800, ib: 'ib-1' },
  { name: 'Yusuf Amin',         arabic: 'يوسف أمين',          country: 'Iraq',    balance: 27600, ib: 'ib-3' },
  { name: 'Maya Darwish',       arabic: 'مايا درويش',         country: 'UAE',     balance: 3900 },
  { name: 'Fadi Rahal',         arabic: 'فادي رحال',          country: 'Turkey',  balance: 11200, ib: 'ib-2', currency: 'USD' },
  { name: 'Nour Zein',          arabic: 'نور زين',            country: 'Egypt',   balance: 2450,  kyc: 'pending' },
  { name: 'Hadi Sabbagh',       arabic: 'هادي صباغ',          country: 'Syria',   balance: 8800,  ib: 'ib-3' },
  { name: 'Dana Issa',          arabic: 'دانة عيسى',          country: 'Kuwait',  balance: 61500 },
  { name: 'Bilal Hamdan',       arabic: 'بلال حمدان',         country: 'Jordan',  balance: -250,  cls: 'bad', limit: 500 },
  { name: 'Salma Odeh',         arabic: 'سلمى عودة',          country: 'Palestine', balance: 4700, ib: 'ib-1' },
  { name: 'Ziad Khalil',        arabic: 'زياد خليل',          country: 'Lebanon', balance: 13300, ib: 'ib-2' },
  { name: 'Reem Najjar',        arabic: 'ريم نجار',           country: 'Saudi Arabia', balance: 22900 },
  { name: 'Blue Bridge Trading', arabic: 'بلو بريدج للتجارة', country: 'UAE',     balance: 38500, currency: 'USD' },
  { name: 'Cedar Gold Co.',     arabic: 'شركة سيدار للذهب',   country: 'Turkey',  balance: 9600,  currency: 'EUR' },
  { name: 'Tala Jaber',         arabic: 'تالا جابر',          country: 'Jordan',  balance: 0,     kyc: 'missing', cls: 'neutral' },
];

export const DEMO_TODAY = () => isoDay(new Date());

// ─── Seed builder ────────────────────────────────────────────────────────────

export interface SeedData {
  accounts: Account[];
  entries: LedgerEntry[];
  nextEntryNo: number;
  requests: OperationRequest[];
  nextRequestNo: number;
  clients: ClientRecord[];
  ibs: IBRecord[];
  trades: Trade[];
  nextTicket: number;
  mt5Balances: Record<string, number>;
  postedTradeIds: string[];
  closedThrough: string;
  branches: Branch[];
  employees: Employee[];
  leaves: LeaveRequest[];
  payrolls: PayrollRun[];
  assets: FixedAsset[];
  owners: Owner[];
  leads: Lead[];
  tickets: Ticket[];
  wallets: Wallet[];
  users: StaffUser[];
  gateways: Gateway[];
  symbols: SymbolSetting[];
  audit: AuditEvent[];
  rates: Rates;
  rateHistory: { date: string; rates: Partial<Rates> }[];
}

export const SYMBOL_PRICES: Record<string, { price: number; contract: number; desc: string; spread: number }> = {
  EURUSD: { price: 1.0812, contract: 100000, desc: 'Euro vs US Dollar',          spread: 0.8 },
  GBPUSD: { price: 1.2655, contract: 100000, desc: 'British Pound vs US Dollar', spread: 1.1 },
  USDJPY: { price: 151.42, contract: 100000, desc: 'US Dollar vs Japanese Yen',  spread: 1.0 },
  XAUUSD: { price: 2385.6, contract: 100,    desc: 'Gold vs US Dollar',          spread: 25 },
  BTCUSD: { price: 67250,  contract: 1,      desc: 'Bitcoin vs US Dollar',       spread: 30 },
  US30:   { price: 39120,  contract: 1,      desc: 'US Wall Street 30 index',    spread: 2.5 },
};

export function buildSeed(): SeedData {
  const rand = rng(20261020);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const today = DEMO_TODAY();
  const rates = { ...DEFAULT_RATES };

  // Clients + their ledger accounts
  const clients: ClientRecord[] = [];
  const clientAccounts: Account[] = [];
  clientSeeds.forEach((c, i) => {
    const code = `21${String(i + 1).padStart(2, '0')}`;
    const currency = c.currency ?? 'USD';
    clientAccounts.push(A(code, c.name, c.arabic, 'clients', currency, c.balance, { creditLimit: c.limit }));
    clients.push({
      id: `cl-${i + 1}`,
      accountNo: code,
      name: c.name,
      arabic: c.arabic,
      email: `${c.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@example.com`,
      phone: `+9${String(60000000 + i * 1234567).slice(0, 9)}`,
      country: c.country,
      mt5Login: String(500100 + i),
      ibParentId: c.ib,
      classification: c.cls ?? 'good',
      active: true,
      joinDate: daysAgo(400 - i * 17),
      creditLimit: c.limit,
      kycStatus: c.kyc ?? 'approved',
    });
  });

  const ibs: IBRecord[] = [
    { id: 'ib-1', name: 'Gulf Star', arabic: 'نجمة الخليج', email: 'gulfstar@example.com', mt5AccountNo: '700101', treeAccountCode: '2201', classification: 'trusted', active: true, linkedClientIds: clients.filter((c) => c.ibParentId === 'ib-1').map((c) => c.id), subIBIds: ['ib-3'], commissionRate: 7, spreadGrant: 0.3, notes: 'Our biggest partner.' },
    { id: 'ib-2', name: 'Anatolia Network', arabic: 'شبكة الأناضول', email: 'anatolia@example.com', mt5AccountNo: '700102', treeAccountCode: '2202', classification: 'trusted', active: true, linkedClientIds: clients.filter((c) => c.ibParentId === 'ib-2').map((c) => c.id), subIBIds: [], commissionRate: 5, spreadGrant: 0.2, notes: 'Always pays on time.' },
    { id: 'ib-3', name: 'Levant Traders', arabic: 'تجار الشام', email: 'levant@example.com', mt5AccountNo: '700103', treeAccountCode: '2203', classification: 'trusted', active: true, linkedClientIds: clients.filter((c) => c.ibParentId === 'ib-3').map((c) => c.id), subIBIds: [], parentIBId: 'ib-1', commissionRate: 4, spreadGrant: 0.1, notes: 'Works under Gulf Star.' },
  ];

  const accounts = [...baseAccounts, ...clientAccounts];
  // Make the first day balance: everything we own = what we owe + owners' money.
  const usdOf = (a: Account) => toUSD(a.opening, a.currency, rates);
  const own = accounts.filter((a) => ['funds', 'banks', 'suppliers', 'staff', 'fixed'].includes(a.category)).reduce((s, a) => s + usdOf(a), 0);
  const owe = accounts.filter((a) => ['clients', 'ibs', 'debts'].includes(a.category)).reduce((s, a) => s + usdOf(a), 0);
  const capital = accounts.filter((a) => a.code === '3101' || a.code === '3102').reduce((s, a) => s + a.opening, 0);
  const plug = accounts.find((a) => a.code === '3103')!;
  plug.opening = round2(own - owe - capital);

  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const entries: LedgerEntry[] = [];
  let entryNo = 1001;
  const post = (date: string, memo: string, kind: EntryKind, lines: LedgerLine[], by: string, ref?: string) => {
    const e: LedgerEntry = {
      id: `je-${entryNo}`, no: entryNo++, date, memo, kind, ref, lines, createdBy: by, createdAt: at(date, 17, Math.floor(rand() * 59)),
    };
    entries.push(e);
    return e;
  };
  /** A line worth `debit`/`credit` US dollars, written in the account's own currency. */
  const usdLine = (code: string, debit: number, credit: number): LedgerLine => {
    const acc = byCode.get(code)!;
    const rate = rates[acc.currency];
    return { accountCode: code, debit: round2(debit / rate), credit: round2(credit / rate), currency: acc.currency, rate };
  };

  // Staff logins
  const users: StaffUser[] = [
    { id: 'u-1', name: 'Ahmad Khalil', email: 'admin@demo.com', role: 'admin', branchId: 'br-1', active: true, lastSeen: at(today, 8) },
    { id: 'u-2', name: 'Rania Odeh', email: 'rania@demo.com', role: 'financial_manager', branchId: 'br-1', active: true, lastSeen: at(daysAgo(1), 16) },
    { id: 'u-3', name: 'Omar Fakhoury', email: 'omar@demo.com', role: 'operations_staff', branchId: 'br-1', active: true, lastSeen: at(today, 9) },
    { id: 'u-4', name: 'Wael Matar', email: 'wael@demo.com', role: 'deposit_withdrawal_staff', branchId: 'br-2', active: true, lastSeen: at(daysAgo(1), 18) },
    { id: 'u-5', name: 'Hiba Zaki', email: 'hiba@demo.com', role: 'viewer', branchId: 'br-3', active: false },
  ];

  // ── Money requests over the last 30 days ──
  const requests: OperationRequest[] = [];
  let requestNo = 1;
  const moneyPlaces = ['1101', '1104', '1105', '1201', '1203', '1107'];
  const makeRequest = (
    day: string, type: RequestType, clientIdx: number, amount: number, counter: string,
    status: OperationRequest['status'], opts: Partial<OperationRequest> = {},
  ) => {
    const client = clientAccounts[clientIdx];
    const createdBy = opts.createdBy ?? 'omar@demo.com';
    const req: OperationRequest = {
      id: `req-${requestNo}`, requestNo, type, date: day, priority: 'normal', status,
      lines: [{ id: `ln-${requestNo}`, accountNo: client.code, accountName: client.name, amount, currency: client.currency, counterAccountCode: counter }],
      createdBy, timeline: [{ action: 'created', by: createdBy, at: day === today ? hoursAgo(1 + (requestNo % 6)) : at(day, 8 + (requestNo % 6), (requestNo * 7) % 60) }],
      source: 'staff',
      ...opts,
    };
    requestNo++;
    const steps: OperationRequest['status'][] = ['confirmed', 'executed', 'voucher'];
    const reached = status === 'pending' || status === 'rejected' ? 0 : steps.indexOf(status) + 1;
    const late = (h: number, m: number) => (day === today ? hoursAgo(Math.max(0, 1 - h / 24)) : at(day, h, m));
    if (reached >= 1) { req.confirmedBy = 'admin@demo.com'; req.timeline.push({ action: 'confirmed', by: 'admin@demo.com', at: late(11, 10) }); }
    if (reached >= 2) { req.executedBy = 'wael@demo.com'; req.timeline.push({ action: 'executed', by: 'wael@demo.com', at: late(12, 5) }); }
    if (reached >= 3) {
      const e = post(day, `${type === 'deposit' ? 'Deposit from' : 'Withdrawal for'} ${client.name}`, type === 'deposit' ? 'deposit' : 'withdrawal', buildRequestLines(req, accounts, rates), 'admin@demo.com', req.id);
      req.voucherRef = `V-${e.no}`;
      req.entryId = e.id;
      req.timeline.push({ action: 'voucher', by: 'admin@demo.com', at: at(day, 12, 30) });
    }
    if (status === 'rejected') {
      req.rejectedBy = 'admin@demo.com';
      req.timeline.push({ action: 'rejected', by: 'admin@demo.com', at: at(day, 10, 0), note: 'Name on the bank transfer does not match the client.' });
    }
    requests.push(req);
    return req;
  };

  const running: Record<string, number> = Object.fromEntries(clientAccounts.map((a) => [a.code, a.opening]));
  for (let d = 30; d >= 1; d--) {
    const day = daysAgo(d);
    const count = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k++) {
      const idx = Math.floor(rand() * 16);
      const acc = clientAccounts[idx];
      if (acc.code === '2112') continue; // Bilal: no new activity
      const amount = Math.round((300 + rand() * 4700) / 50) * 50;
      // Only take money out when the client really has enough.
      const isDeposit = rand() > 0.42 || running[acc.code] < amount * 2;
      const counter = acc.currency === 'EUR' ? '1205' : pick(moneyPlaces);
      makeRequest(day, isDeposit ? 'deposit' : 'withdrawal', idx, amount, counter, 'voucher');
      running[acc.code] += isDeposit ? amount : -amount;
    }
  }
  // Today: work in progress
  makeRequest(today, 'deposit', 0, 2500, '1201', 'executed');
  makeRequest(today, 'withdrawal', 2, 4000, '1203', 'confirmed');
  makeRequest(today, 'deposit', 5, 1200, '1104', 'pending', { priority: 'urgent' });
  makeRequest(today, 'withdrawal', 10, 12500, '1201', 'pending', { note: 'Client wants it before Friday.' });
  makeRequest(today, 'deposit', 7, 900, '1107', 'pending', { source: 'client_portal', createdBy: 'client portal' });
  makeRequest(daysAgo(1), 'withdrawal', 11, 300, '1105', 'rejected');
  const ibPayout: OperationRequest = {
    id: `req-${requestNo}`, requestNo: requestNo++, type: 'ib_withdrawal', date: today, priority: 'normal', status: 'pending',
    lines: [{ id: 'ln-ib-1', accountNo: '2201', accountName: 'Partner: Gulf Star', amount: 1500, currency: 'USD', counterAccountCode: '1203' }],
    createdBy: 'ib portal', source: 'ib_portal', note: 'Monthly partner pay.',
    timeline: [{ action: 'created', by: 'ib portal', at: hoursAgo(6) }],
  };
  requests.push(ibPayout);
  const expenseReq: OperationRequest = {
    id: `req-${requestNo}`, requestNo: requestNo++, type: 'expense', expenseSubType: 'gift', date: today, priority: 'normal', status: 'pending',
    lines: [{ id: 'ln-exp-1', accountNo: '5108', accountName: 'Gifts and compensation', amount: 150, currency: 'USD', counterAccountCode: '1101' }],
    createdBy: 'omar@demo.com', note: 'Gift for our top client.',
    timeline: [{ action: 'created', by: 'omar@demo.com', at: hoursAgo(2) }],
  };
  requests.push(expenseReq);

  // ── Trades ──
  const symbols = Object.keys(SYMBOL_PRICES);
  const trades: Trade[] = [];
  let ticket = 880001;
  const activeClients = clients.filter((c) => c.kycStatus === 'approved' && c.classification !== 'bad');
  for (let d = 30; d >= 0; d--) {
    const day = daysAgo(d);
    const n = 5 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const client = pick(activeClients);
      const symbol = pick(symbols);
      const sp = SYMBOL_PRICES[symbol];
      const lots = Math.round((0.3 + rand() * 2.7) * 10) / 10;
      const side = rand() > 0.5 ? 'buy' : 'sell';
      const move = (rand() - 0.48) * 0.006;
      const openPrice = +(sp.price * (1 - move)).toFixed(symbol === 'USDJPY' ? 3 : 5);
      const isOpen = d <= 3 && rand() > 0.55;
      const closePrice = isOpen ? undefined : +(sp.price * (1 + (rand() - 0.5) * 0.004)).toFixed(symbol === 'USDJPY' ? 3 : 5);
      const ref = closePrice ?? sp.price;
      let pnl = (side === 'buy' ? ref - openPrice : openPrice - ref) * lots * sp.contract;
      if (symbol === 'USDJPY') pnl = pnl / ref;
      // Most retail clients lose money over time.
      pnl = rand() < 0.66 ? -Math.abs(pnl) - lots * 15 : Math.abs(pnl) * 0.8;
      pnl = round2(Math.max(-2500, Math.min(2500, pnl)));
      trades.push({
        id: `tr-${ticket}`, ticket: ticket++, clientId: client.id, symbol, side, lots,
        openPrice, closePrice, currentPrice: sp.price,
        openedAt: at(day, 9 + Math.floor(rand() * 6), Math.floor(rand() * 59)),
        closedAt: isOpen ? undefined : at(day, 15 + Math.floor(rand() * 3), Math.floor(rand() * 59)),
        profit: pnl, commission: round2(lots * 3.5), swap: isOpen ? round2(-lots * 0.6) : 0,
        status: isOpen ? 'open' : 'closed',
        book: client.classification === 'good' && rand() > 0.6 ? 'A' : 'B',
      });
    }
  }

  // ── Daily close for every day before today: book trading results and partner pay ──
  const closedThrough = daysAgo(1);
  const postedTradeIds: string[] = [];
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const ibById = new Map(ibs.map((i) => [i.id, i]));
  for (let d = 30; d >= 1; d--) {
    const day = daysAgo(d);
    const closed = trades.filter((t) => t.status === 'closed' && t.closedAt!.slice(0, 10) === day);
    if (!closed.length) continue;
    const lines: LedgerLine[] = [];
    let resultsNet = 0;
    let fees = 0;
    let spread = 0;
    const ibPay: Record<string, number> = {};
    for (const t of closed) {
      const client = clientById.get(t.clientId)!;
      const acc = client.accountNo;
      // Client profit → we owe them more. Client loss → we owe them less.
      const net = round2(t.profit - t.commission);
      if (net > 0) lines.push(usdLine(acc, 0, net)); else if (net < 0) lines.push(usdLine(acc, -net, 0));
      fees += t.commission;
      if (t.book === 'B') resultsNet += t.profit; else spread += t.lots * 6;
      if (client.ibParentId) {
        const ib = ibById.get(client.ibParentId)!;
        ibPay[ib.treeAccountCode] = (ibPay[ib.treeAccountCode] ?? 0) + t.lots * ib.commissionRate;
      }
      postedTradeIds.push(t.id);
    }
    // A-book trades: the trading partner covers client profit/loss.
    const aNet = round2(closed.filter((t) => t.book === 'A').reduce((s, t) => s + t.profit, 0));
    if (aNet > 0) lines.push(usdLine('1301', aNet, 0)); else if (aNet < 0) lines.push(usdLine('1301', 0, -aNet));
    if (resultsNet > 0) lines.push(usdLine('4103', round2(resultsNet), 0)); else if (resultsNet < 0) lines.push(usdLine('4103', 0, round2(-resultsNet)));
    if (fees > 0) lines.push(usdLine('4102', 0, round2(fees)));
    if (spread > 0) { lines.push(usdLine('1301', round2(spread), 0)); lines.push(usdLine('4101', 0, round2(spread))); }
    post(day, 'Trading results for the day', 'trade_pnl', lines, 'system', `eod-${day}`);
    const ibLines: LedgerLine[] = [];
    let ibTotal = 0;
    for (const [code, amt] of Object.entries(ibPay)) { ibLines.push(usdLine(code, 0, amt)); ibTotal += round2(amt); }
    if (ibTotal > 0) post(day, 'Partner (IB) pay for the day', 'ib_commission', [usdLine('5103', ibTotal, 0), ...ibLines], 'system', `eod-${day}`);
  }

  // ── Costs and income ──
  const firstOfMonth = (offsetMonths: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offsetMonths); return isoDay(d); };
  for (const m of [1, 0]) {
    const day = firstOfMonth(m);
    if (day > today || day < daysAgo(31)) continue;
    post(day, 'Office rent', 'expense', [usdLine('5102', 4500, 0), usdLine('1201', 0, 4500)], 'rania@demo.com');
    post(day, 'Internet, MT5 licence and software', 'expense', [usdLine('5105', 1850, 0), usdLine('1203', 0, 1850)], 'rania@demo.com');
  }
  for (let d = 28; d >= 1; d -= 7) {
    const fee = 120 + Math.round(rand() * 90);
    post(daysAgo(d), 'Bank and transfer fees', 'expense', [usdLine('5104', fee, 0), usdLine('1201', 0, fee)], 'rania@demo.com');
  }
  post(daysAgo(18), 'Social media ads', 'expense', [usdLine('5106', 2200, 0), usdLine('1203', 0, 2200)], 'rania@demo.com');
  post(daysAgo(9), 'Money exchange profit (USD → TRY)', 'income', [usdLine('1101', 640, 0), usdLine('4104', 0, 640)], 'omar@demo.com');
  post(daysAgo(4), 'Money exchange profit (USD → AED)', 'income', [usdLine('1101', 415, 0), usdLine('4104', 0, 415)], 'omar@demo.com');

  // ── Team ──
  const branches: Branch[] = [
    { id: 'br-1', name: 'Main office', arabic: 'المكتب الرئيسي', city: 'Dubai', manager: 'Ahmad Khalil', phone: '+971 4 000 0000', cashAccountCode: '1101', active: true },
    { id: 'br-2', name: 'Istanbul branch', arabic: 'فرع إسطنبول', city: 'Istanbul', manager: 'Leen Haddad', phone: '+90 212 000 0000', cashAccountCode: '1104', active: true },
    { id: 'br-3', name: 'Amman branch', arabic: 'فرع عمّان', city: 'Amman', manager: 'Hiba Zaki', phone: '+962 6 000 0000', cashAccountCode: '1105', active: true },
  ];
  const employees: Employee[] = [
    { id: 'emp-1', name: 'Ahmad Khalil',  arabic: 'أحمد خليل',  role: 'General manager',    branchId: 'br-1', salary: 3500, joinDate: '2023-02-01', active: true, leaveDaysLeft: 14 },
    { id: 'emp-2', name: 'Rania Odeh',    arabic: 'رانيا عودة',  role: 'Accountant',         branchId: 'br-1', salary: 2200, joinDate: '2023-05-15', active: true, leaveDaysLeft: 9, loanAccountCode: '1402' },
    { id: 'emp-3', name: 'Omar Fakhoury', arabic: 'عمر فاخوري', role: 'Operations',         branchId: 'br-1', salary: 1800, joinDate: '2024-01-10', active: true, leaveDaysLeft: 12, loanAccountCode: '1401' },
    { id: 'emp-4', name: 'Leen Haddad',   arabic: 'لين حداد',    role: 'Branch manager',     branchId: 'br-2', salary: 2400, joinDate: '2023-09-01', active: true, leaveDaysLeft: 6 },
    { id: 'emp-5', name: 'Wael Matar',    arabic: 'وائل مطر',    role: 'Cashier',            branchId: 'br-2', salary: 1400, joinDate: '2024-06-20', active: true, leaveDaysLeft: 15 },
    { id: 'emp-6', name: 'Hiba Zaki',     arabic: 'هبة زكي',     role: 'Branch manager',     branchId: 'br-3', salary: 2100, joinDate: '2024-03-03', active: true, leaveDaysLeft: 10 },
    { id: 'emp-7', name: 'Sara Qasem',    arabic: 'سارة قاسم',   role: 'Sales',              branchId: 'br-1', salary: 1500, joinDate: '2025-01-12', active: true, leaveDaysLeft: 18 },
    { id: 'emp-8', name: 'Majd Toma',     arabic: 'مجد توما',    role: 'IT support',         branchId: 'br-1', salary: 2000, joinDate: '2024-11-04', active: true, leaveDaysLeft: 11 },
  ];
  const leaves: LeaveRequest[] = [
    { id: 'lv-1', employeeId: 'emp-5', from: daysAgo(-5), to: daysAgo(-8), reason: 'Family visit', status: 'pending' },
    { id: 'lv-2', employeeId: 'emp-2', from: daysAgo(20), to: daysAgo(18), reason: 'Sick', status: 'approved' },
  ];

  // Last month's salaries
  const payrolls: PayrollRun[] = [];
  const lastMonthEnd = (() => { const d = new Date(); d.setDate(0); return isoDay(d); })();
  if (lastMonthEnd >= daysAgo(31)) {
    const total = employees.filter((e) => e.active).reduce((s, e) => s + e.salary, 0);
    const e = post(lastMonthEnd, `Salaries for ${lastMonthEnd.slice(0, 7)}`, 'payroll', [usdLine('5101', total, 0), usdLine('1201', 0, total)], 'rania@demo.com', `payroll-${lastMonthEnd.slice(0, 7)}`);
    payrolls.push({ id: 'pay-1', month: lastMonthEnd.slice(0, 7), total, paidFrom: '1201', entryId: e.id, createdAt: e.createdAt });
    post(lastMonthEnd, 'Wear and tear for the month', 'depreciation', [usdLine('5107', 640, 0), usdLine('1509', 0, 640)], 'system');
  }

  const assets: FixedAsset[] = [
    { id: 'as-1', name: 'Dealer computers (6)', arabic: 'حواسيب المتداولين (6)', kind: 'computers', cost: 9000, boughtOn: '2025-03-01', lifeMonths: 36, monthsDepreciated: 7, branchId: 'br-1', active: true },
    { id: 'as-2', name: 'Big wall screens', arabic: 'شاشات حائط كبيرة', kind: 'computers', cost: 5000, boughtOn: '2025-03-01', lifeMonths: 36, monthsDepreciated: 7, branchId: 'br-1', active: true },
    { id: 'as-3', name: 'Office desks and chairs', arabic: 'مكاتب وكراسي', kind: 'furniture', cost: 6000, boughtOn: '2024-12-01', lifeMonths: 60, monthsDepreciated: 10, branchId: 'br-1', active: true },
    { id: 'as-4', name: 'Istanbul branch furniture', arabic: 'أثاث فرع إسطنبول', kind: 'furniture', cost: 3000, boughtOn: '2025-06-01', lifeMonths: 60, monthsDepreciated: 4, branchId: 'br-2', active: true },
  ];

  const owners: Owner[] = [
    { id: 'own-1', name: 'Adam Saad', arabic: 'آدم سعد', sharePercent: 60, capitalAccountCode: '3101', joined: '2023-01-01' },
    { id: 'own-2', name: 'Jana Barakat', arabic: 'جنى بركات', sharePercent: 40, capitalAccountCode: '3102', joined: '2023-01-01' },
  ];

  const leads: Lead[] = [
    { id: 'ld-1', name: 'Khaled Nasr',  phone: '+962 79 000 1111', country: 'Jordan', source: 'website', stage: 'new',     ownerName: 'Sara Qasem', createdAt: daysAgo(1) },
    { id: 'ld-2', name: 'Mona Fawaz',   phone: '+971 50 000 2222', country: 'UAE',    source: 'partner', stage: 'talking', ownerName: 'Sara Qasem', createdAt: daysAgo(4), note: 'Wants gold trading.' },
    { id: 'ld-3', name: 'Adel Hariri',  phone: '+90 532 000 3333', country: 'Turkey', source: 'social',  stage: 'docs',    ownerName: 'Leen Haddad', createdAt: daysAgo(6), note: 'Sent passport, waiting for address proof.' },
    { id: 'ld-4', name: 'Samar Kanaan', phone: '+961 3 000 444',   country: 'Lebanon', source: 'friend', stage: 'won',     ownerName: 'Sara Qasem', createdAt: daysAgo(12) },
    { id: 'ld-5', name: 'Rami Aboud',   phone: '+964 770 000 555', country: 'Iraq',   source: 'event',   stage: 'lost',    ownerName: 'Ahmad Khalil', createdAt: daysAgo(15), note: 'Chose another broker.' },
    { id: 'ld-6', name: 'Joud Hamad',   phone: '+966 55 000 6666', country: 'Saudi Arabia', source: 'website', stage: 'talking', ownerName: 'Sara Qasem', createdAt: daysAgo(2) },
  ];
  const tickets: Ticket[] = [
    { id: 'tk-1', clientId: 'cl-9',  subject: 'How do I upload my ID?',            status: 'open',    priority: 'normal', createdAt: at(today, 9) },
    { id: 'tk-2', clientId: 'cl-12', subject: 'Why was my withdrawal stopped?',    status: 'waiting', priority: 'high',   createdAt: at(daysAgo(1), 14) },
    { id: 'tk-3', clientId: 'cl-3',  subject: 'Please send my monthly statement',  status: 'closed',  priority: 'low',    createdAt: at(daysAgo(5), 11) },
    { id: 'tk-4', clientId: 'cl-6',  subject: 'Can I trade gold on my phone?',     status: 'open',    priority: 'normal', createdAt: at(daysAgo(2), 10) },
  ];
  const wallets: Wallet[] = [
    { id: 'wl-1', clientId: 'cl-3',  currency: 'USDT', kind: 'crypto',  provider: 'TRC20', address: 'TXa9…k2Lq', verified: true },
    { id: 'wl-2', clientId: 'cl-11', currency: 'USDT', kind: 'crypto',  provider: 'ERC20', address: '0x7c…91aB', verified: true },
    { id: 'wl-3', clientId: 'cl-1',  currency: 'USD',  kind: 'card',    provider: 'Visa ••4242', verified: true },
    { id: 'wl-4', clientId: 'cl-4',  currency: 'TRY',  kind: 'ewallet', provider: 'Papara', verified: false },
    { id: 'wl-5', clientId: 'cl-8',  currency: 'USD',  kind: 'ewallet', provider: 'Skrill', verified: true },
  ];
  const gateways: Gateway[] = [
    { id: 'gw-1', name: 'Bank transfer (Atlas Bank)', kind: 'bank',   accountCode: '1201', feePercent: 0,   enabled: true },
    { id: 'gw-2', name: 'Cards (Visa / Mastercard)',  kind: 'card',   accountCode: '1203', feePercent: 2.5, enabled: true },
    { id: 'gw-3', name: 'USDT (TRC20)',                kind: 'crypto', accountCode: '1107', feePercent: 0.5, enabled: true },
    { id: 'gw-4', name: 'Skrill',                      kind: 'ewallet', accountCode: '1203', feePercent: 1.9, enabled: false },
  ];
  const symbolSettings: SymbolSetting[] = Object.entries(SYMBOL_PRICES).map(([symbol, s]) => ({
    symbol, description: s.desc, contractSize: s.contract, spread: s.spread, maxLots: symbol === 'BTCUSD' ? 5 : 50, enabled: true,
  }));

  // MT5 balances. They match the books, except:
  //  • today's closed trades are not in the books yet (they get booked when the day is closed)
  //  • money already sent on MT5 but not yet written in the books
  //  • one client where MT5 shows $150 more than the books — something to check
  const tmpBalances: Record<string, number> = {};
  for (const a of clientAccounts) tmpBalances[a.code] = a.opening;
  for (const e of entries) for (const l of e.lines) {
    if (tmpBalances[l.accountCode] === undefined) continue;
    tmpBalances[l.accountCode] = round2(tmpBalances[l.accountCode] + (l.credit - l.debit));
  }
  const mt5Balances: Record<string, number> = { ...tmpBalances };
  for (const t of trades) {
    if (t.status !== 'closed' || postedTradeIds.includes(t.id)) continue;
    const code = clientById.get(t.clientId)!.accountNo;
    mt5Balances[code] = round2(mt5Balances[code] + t.profit - t.commission);
  }
  for (const r of requests) {
    if (r.status !== 'executed') continue;
    for (const l of r.lines) {
      if (mt5Balances[l.accountNo] === undefined) continue;
      mt5Balances[l.accountNo] = round2(mt5Balances[l.accountNo] + (r.type === 'deposit' ? l.amount : -l.amount));
    }
  }
  mt5Balances['2110'] = round2(mt5Balances['2110'] + 150);

  const audit: AuditEvent[] = [
    { id: 'au-1', at: at(daysAgo(1), 19), by: 'rania@demo.com', action: `Closed the day ${daysAgo(1)}`, actionAr: `أغلقت يوم ${daysAgo(1)}` },
    { id: 'au-2', at: at(today, 8), by: 'admin@demo.com', action: 'Signed in', actionAr: 'سجّل الدخول' },
  ];

  // Rate history for the chart (USD/TRY drifts up slowly)
  const rateHistory = Array.from({ length: 31 }, (_, i) => {
    const d = 30 - i;
    const tryPerUsd = 45.5 - d * 0.035 + (rand() - 0.5) * 0.12;
    const usdPerEur = 1.08 + (rand() - 0.5) * 0.01;
    return { date: daysAgo(d), rates: { TRY: 1 / tryPerUsd, EUR: usdPerEur } };
  });

  return {
    accounts, entries, nextEntryNo: entryNo, requests, nextRequestNo: requestNo,
    clients, ibs, trades, nextTicket: ticket, mt5Balances, postedTradeIds, closedThrough,
    branches, employees, leaves, payrolls, assets, owners, leads, tickets, wallets, users,
    gateways, symbols: symbolSettings, audit, rates, rateHistory,
  };
}
