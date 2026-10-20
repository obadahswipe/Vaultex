import type { StaffUser } from '@/lib/data/types';

type Role = StaffUser['role'] | string;

const ADMIN_ROLES = ['financial_manager', 'admin', 'CFO'];
const ALL_STAFF = [...ADMIN_ROLES, 'operations_staff', 'accountant'];
const EXEC_ROLES = [...ADMIN_ROLES, 'deposit_withdrawal_staff'];

/** Who can do each step of a money request. */
export const canCreateRequest = (role: Role) => ALL_STAFF.includes(role) || role === 'deposit_withdrawal_staff';
export const canConfirmRequest = (role: Role) => ADMIN_ROLES.includes(role);
export const canExecuteRequest = (role: Role) => EXEC_ROLES.includes(role);
export const canCreateVoucher = (role: Role) => ADMIN_ROLES.includes(role) || role === 'accountant';
export const canPostEntries = (role: Role) => ADMIN_ROLES.includes(role) || role === 'accountant';
export const canManageSettings = (role: Role) => ADMIN_ROLES.includes(role);
export const isAdmin = (role: Role) => ADMIN_ROLES.includes(role);
export const isDepositWithdrawStaff = (role: Role) => role === 'deposit_withdrawal_staff';
export const isAccountant = (role: Role) => role === 'accountant' || ADMIN_ROLES.includes(role);

export const ROLE_LABELS: Record<StaffUser['role'], { en: string; ar: string; doesEn: string; doesAr: string }> = {
  admin:                    { en: 'Owner / admin',     ar: 'المالك / المدير العام', doesEn: 'Can do everything.',                              doesAr: 'يستطيع فعل كل شيء.' },
  financial_manager:        { en: 'Finance manager',   ar: 'المدير المالي',        doesEn: 'Says OK to money and sees all reports.',           doesAr: 'يوافق على المال ويرى كل التقارير.' },
  accountant:               { en: 'Accountant',        ar: 'محاسب',               doesEn: 'Writes entries in the books and closes the day.',  doesAr: 'يسجّل القيود في الدفاتر ويغلق اليوم.' },
  operations_staff:         { en: 'Operations',        ar: 'موظف عمليات',         doesEn: 'Makes money requests for clients.',                doesAr: 'ينشئ طلبات المال للزبائن.' },
  deposit_withdrawal_staff: { en: 'Cashier',           ar: 'أمين صندوق',          doesEn: 'Sends the money after it gets an OK.',             doesAr: 'يرسل المال بعد الموافقة.' },
  viewer:                   { en: 'Can only look',     ar: 'مشاهدة فقط',          doesEn: 'Can look at pages but cannot change anything.',     doesAr: 'يرى الصفحات ولا يستطيع تغيير شيء.' },
};

export function roleLabel(role: Role, lang: 'en' | 'ar') {
  const r = ROLE_LABELS[role as StaffUser['role']];
  if (!r) return role;
  return lang === 'ar' ? r.ar : r.en;
}
