// Core data types for Vaultex. Every page reads from one store built on these,
// so a number shown in one place is the same number everywhere.

export type Currency = 'USD' | 'EUR' | 'TRY' | 'AED' | 'USDT' | 'GBP' | 'SAR';
export const CURRENCIES: Currency[] = ['USD', 'EUR', 'TRY', 'AED', 'USDT', 'GBP', 'SAR'];

export type Category =
  | 'funds'     // cash boxes                    (we own)
  | 'banks'     // bank accounts                 (we own)
  | 'suppliers' // transfer companies            (they hold our money)
  | 'staff'     // money lent to staff           (they owe us)
  | 'fixed'     // things we own (computers…)    (we own)
  | 'clients'   // money clients keep with us    (we owe)
  | 'ibs'       // money we owe partners (IBs)   (we owe)
  | 'debts'     // bills we still have to pay    (we owe)
  | 'partners'  // the owners' money             (owners)
  | 'revenue'   // money we earned
  | 'expenses'; // money we spent

export const CATEGORIES: Category[] = [
  'funds', 'banks', 'suppliers', 'staff', 'fixed',
  'clients', 'ibs', 'debts', 'partners', 'revenue', 'expenses',
];

/** Categories whose balance goes UP with a debit (things we own + costs). */
export const DEBIT_NORMAL: Record<Category, boolean> = {
  funds: true, banks: true, suppliers: true, staff: true, fixed: true, expenses: true,
  clients: false, ibs: false, debts: false, partners: false, revenue: false,
};

export type AccountGroup = 'own' | 'owe' | 'owners' | 'earned' | 'spent';
export const CATEGORY_GROUP: Record<Category, AccountGroup> = {
  funds: 'own', banks: 'own', suppliers: 'own', staff: 'own', fixed: 'own',
  clients: 'owe', ibs: 'owe', debts: 'owe',
  partners: 'owners',
  revenue: 'earned',
  expenses: 'spent',
};

export interface Account {
  code: string;
  name: string;
  arabic: string;
  category: Category;
  currency: Currency;
  /** Balance on the first day, written the way a person reads it (we owe a client 500 → 500). */
  opening: number;
  active: boolean;
  creditLimit?: number;
  branchId?: string;
  system?: boolean; // accounts Vaultex needs (cannot be deleted)
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

export type EntryKind =
  | 'deposit' | 'withdrawal' | 'transfer' | 'expense' | 'income'
  | 'ib_commission' | 'ib_payout' | 'payroll' | 'asset_buy' | 'depreciation'
  | 'capital' | 'trade_pnl' | 'manual';

export interface LedgerLine {
  accountCode: string;
  debit: number;   // in the account's own currency
  credit: number;  // in the account's own currency
  currency: Currency;
  rate: number;    // USD for 1 unit, at the time of posting
}

export interface LedgerEntry {
  id: string;
  no: number;           // voucher number people can quote
  date: string;         // YYYY-MM-DD
  memo: string;
  kind: EntryKind;
  ref?: string;         // e.g. request id, payroll month
  lines: LedgerLine[];
  createdBy: string;
  createdAt: string;    // ISO
}

// ─── Money requests (deposits, withdrawals, transfers, expenses) ────────────

export type RequestType =
  | 'deposit' | 'withdrawal' | 'ib_withdrawal' | 'ib_deposit'
  | 'transfer_to' | 'transfer_from' | 'expense';

export type ExpenseSubType = 'gift' | 'compensation' | 'transfer_commission';
export type RequestStatus = 'pending' | 'confirmed' | 'executed' | 'voucher' | 'rejected';
export type RequestPriority = 'normal' | 'urgent';

export interface TimelineEvent {
  action: 'created' | 'confirmed' | 'executed' | 'voucher' | 'rejected';
  by: string;
  at: string;
  note?: string;
}

export interface RequestLine {
  id: string;
  /** Who the money belongs to: a client, a partner (IB), or an expense account. */
  accountNo: string;
  accountName?: string;
  amount: number;
  currency: Currency;
  /** Where the money goes in or out: a cash box, a bank, or (for transfers) the other account. */
  counterAccountCode?: string;
  /** How many units of the counter account's currency for 1 unit of `currency`. */
  exchangeRate?: number;
  receivedAmount?: number;
}

export interface OperationRequest {
  id: string;
  requestNo: number;
  type: RequestType;
  expenseSubType?: ExpenseSubType;
  date: string;
  priority: RequestPriority;
  status: RequestStatus;
  lines: RequestLine[];
  createdBy: string;
  confirmedBy?: string;
  executedBy?: string;
  rejectedBy?: string;
  voucherRef?: string;
  entryId?: string;
  note?: string;
  source?: 'staff' | 'client_portal' | 'ib_portal';
  attachmentBase64?: string;
  timeline: TimelineEvent[];
}

export interface OperationsSettings {
  requireDifferentConfirmer: boolean;
  manualMT5Execution: boolean;
  digitalWalletMode: boolean;
  urgentThresholdHours: number;
  largeTransactionThreshold: number;
}

// ─── Clients & partners ──────────────────────────────────────────────────────

export type ClientClassification = 'good' | 'fraud' | 'bad' | 'neutral';

export interface ClientRecord {
  id: string;
  accountNo: string;      // ledger account code
  name: string;
  arabic?: string;
  email?: string;
  phone?: string;
  country?: string;
  mt5Login?: string;
  ibParentId?: string;
  classification: ClientClassification;
  treeAccountCode?: string;
  notes?: string;
  active: boolean;
  joinDate?: string;
  creditLimit?: number;
  kycStatus?: 'approved' | 'pending' | 'missing';
}

export type IBClassification = 'trusted' | 'hard_debt' | 'impossible_debt' | string;

export interface IBRecord {
  id: string;
  name: string;
  arabic?: string;
  email?: string;
  mt5AccountNo: string;
  treeAccountCode: string; // ledger account (category 'ibs')
  classification: IBClassification;
  active: boolean;
  linkedClientIds: string[];
  subIBIds: string[];
  parentIBId?: string;
  /** USD paid to the partner for every 1 lot their clients trade. */
  commissionRate: number;
  spreadGrant?: number;
  notes?: string;
}

// ─── Trading ─────────────────────────────────────────────────────────────────

export interface Trade {
  id: string;
  ticket: number;
  clientId: string;
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  openPrice: number;
  closePrice?: number;
  currentPrice: number;
  openedAt: string;
  closedAt?: string;
  profit: number;      // client profit in USD (closed: realized, open: floating)
  commission: number;  // charged to client, USD
  swap: number;
  status: 'open' | 'closed';
  book: 'A' | 'B';     // A = passed to a liquidity provider, B = kept in-house
}

export interface MT5Account {
  code: string;
  name: string;
  balance: number; // USD, as reported by MT5
}

export interface SymbolSetting {
  symbol: string;
  description: string;
  contractSize: number;
  spread: number;
  maxLots: number;
  enabled: boolean;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  arabic: string;
  city: string;
  manager: string;
  phone?: string;
  cashAccountCode?: string;
  active: boolean;
}

export interface Employee {
  id: string;
  name: string;
  arabic?: string;
  role: string;
  branchId: string;
  salary: number;       // USD per month
  joinDate: string;
  loanAccountCode?: string;
  active: boolean;
  leaveDaysLeft: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  from: string;
  to: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PayrollRun {
  id: string;
  month: string;        // YYYY-MM
  total: number;
  paidFrom: string;     // account code
  entryId: string;
  createdAt: string;
}

export interface FixedAsset {
  id: string;
  name: string;
  arabic?: string;
  kind: 'computers' | 'furniture' | 'vehicles' | 'office' | 'software';
  cost: number;          // USD
  boughtOn: string;
  lifeMonths: number;
  monthsDepreciated: number;
  branchId?: string;
  active: boolean;
}

export interface Owner {
  id: string;
  name: string;
  arabic?: string;
  sharePercent: number;
  capitalAccountCode: string;
  joined: string;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
  source: 'website' | 'partner' | 'friend' | 'social' | 'event';
  stage: 'new' | 'talking' | 'docs' | 'won' | 'lost';
  ownerName: string;
  createdAt: string;
  note?: string;
}

export interface Ticket {
  id: string;
  clientId?: string;
  subject: string;
  status: 'open' | 'waiting' | 'closed';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
}

export interface Wallet {
  id: string;
  clientId: string;
  currency: Currency;
  address?: string;
  kind: 'crypto' | 'ewallet' | 'card';
  provider: string;
  verified: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'financial_manager' | 'accountant' | 'operations_staff' | 'deposit_withdrawal_staff' | 'viewer';
  branchId?: string;
  active: boolean;
  lastSeen?: string;
}

export interface Gateway {
  id: string;
  name: string;
  kind: 'bank' | 'card' | 'crypto' | 'ewallet';
  accountCode: string;   // where money lands
  feePercent: number;
  enabled: boolean;
}

export type AlertType =
  | 'pending_expired' | 'large_transaction' | 'negative_balance'
  | 'reconciliation_gap' | 'duplicate_detected' | 'credit_limit';

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  createdAt: string;
  read: boolean;
  linkedRequestId?: string;
  linkedAccountCode?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  by: string;
  action: string;
  actionAr: string;
}
