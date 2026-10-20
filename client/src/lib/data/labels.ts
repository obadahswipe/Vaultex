// Plain-language names used across the app, in English and Arabic.
import type { Category, ClientClassification, EntryKind, RequestStatus, RequestType } from './types';

type L = { en: string; ar: string };

export const CATEGORY_LABEL: Record<Category, L & { color: string; helpEn: string; helpAr: string }> = {
  funds:     { en: 'Cash boxes',        ar: 'الصناديق النقدية', color: 'bg-orange-400',  helpEn: 'Cash you keep in the office.',            helpAr: 'النقود التي تحفظها في المكتب.' },
  banks:     { en: 'Banks',             ar: 'البنوك',           color: 'bg-sky-400',     helpEn: 'Money in your bank accounts.',            helpAr: 'المال في حساباتك البنكية.' },
  suppliers: { en: 'Money partners',    ar: 'شركاء المال',      color: 'bg-emerald-400', helpEn: 'Trading and transfer companies that hold your money.', helpAr: 'شركات التداول والحوالات التي تحفظ مالك.' },
  staff:     { en: 'Loans to staff',    ar: 'سلف الموظفين',     color: 'bg-amber-400',   helpEn: 'Money your staff will pay back.',         helpAr: 'مال سيعيده موظفوك.' },
  fixed:     { en: 'Things we own',     ar: 'ممتلكات الشركة',   color: 'bg-slate-400',   helpEn: 'Computers, furniture and other things.',  helpAr: 'الحواسيب والأثاث وغيرها.' },
  clients:   { en: "Clients' money",    ar: 'أموال الزبائن',    color: 'bg-pink-400',    helpEn: 'Money clients keep with you. You owe it to them.', helpAr: 'مال يحفظه الزبائن لديك. وهو حق لهم.' },
  ibs:       { en: 'Owed to partners',  ar: 'مستحق للشركاء',    color: 'bg-violet-400',  helpEn: 'Pay your partners (IBs) earned but did not get yet.', helpAr: 'أجر ربحه الشركاء ولم يستلموه بعد.' },
  debts:     { en: 'Bills to pay',      ar: 'فواتير مستحقة',    color: 'bg-red-400',     helpEn: 'Taxes, salaries and bills not paid yet.', helpAr: 'ضرائب ورواتب وفواتير لم تُدفع بعد.' },
  partners:  { en: "Owners' money",     ar: 'أموال المالكين',   color: 'bg-indigo-400',  helpEn: 'Money the owners put in, plus profit kept.', helpAr: 'المال الذي وضعه المالكون، مع الأرباح المحتفظ بها.' },
  revenue:   { en: 'Money earned',      ar: 'المال المكتسب',    color: 'bg-emerald-500', helpEn: 'Income from spreads, fees and exchange.', helpAr: 'الدخل من فرق السعر والرسوم والصرافة.' },
  expenses:  { en: 'Money spent',       ar: 'المال المصروف',    color: 'bg-red-500',     helpEn: 'Salaries, rent, fees and other costs.',   helpAr: 'الرواتب والإيجار والرسوم وغيرها.' },
};

export const REQUEST_TYPE_LABEL: Record<RequestType, L & { helpEn: string; helpAr: string }> = {
  deposit:       { en: 'Add money',              ar: 'إضافة مال',          helpEn: 'A client gives you money for their account.', helpAr: 'الزبون يعطيك مالًا لحسابه.' },
  withdrawal:    { en: 'Take out money',         ar: 'سحب مال',            helpEn: 'A client takes money out of their account.',   helpAr: 'الزبون يسحب مالًا من حسابه.' },
  ib_deposit:    { en: 'Partner adds money',     ar: 'الشريك يضيف مالًا',  helpEn: 'A partner (IB) gives you money.',               helpAr: 'شريك (وكيل) يعطيك مالًا.' },
  ib_withdrawal: { en: 'Pay a partner',          ar: 'دفع أجر شريك',       helpEn: 'You pay a partner (IB) what they earned.',     helpAr: 'تدفع لشريك (وكيل) ما ربحه.' },
  transfer_from: { en: 'Move money',             ar: 'نقل مال',            helpEn: 'Move money from one place or client to another.', helpAr: 'انقل المال من مكان أو زبون إلى آخر.' },
  transfer_to:   { en: 'Move money in',          ar: 'نقل مال إلى',        helpEn: 'Money moves into this account from another.',  helpAr: 'ينتقل المال إلى هذا الحساب من حساب آخر.' },
  expense:       { en: 'Pay a cost',             ar: 'دفع مصروف',          helpEn: 'The company pays for something.',              helpAr: 'الشركة تدفع ثمن شيء.' },
};

export const STATUS_LABEL: Record<RequestStatus, L & { helpEn: string; helpAr: string }> = {
  pending:   { en: 'Needs OK',        ar: 'تحتاج موافقة',       helpEn: 'Waiting for a manager to say OK.',       helpAr: 'تنتظر موافقة المدير.' },
  confirmed: { en: 'OK given',        ar: 'تمت الموافقة',        helpEn: 'Approved. Now send the money.',          helpAr: 'تمت الموافقة. أرسل المال الآن.' },
  executed:  { en: 'Money sent',      ar: 'أُرسل المال',          helpEn: 'Done on MT5. Now write it in the books.', helpAr: 'تم على MT5. سجّله في الدفاتر الآن.' },
  voucher:   { en: 'Done',            ar: 'مكتمل',               helpEn: 'Finished and written in the books.',     helpAr: 'انتهى وسُجّل في الدفاتر.' },
  rejected:  { en: 'Said no',         ar: 'مرفوض',               helpEn: 'A manager said no.',                     helpAr: 'المدير رفض الطلب.' },
};

export const ENTRY_KIND_LABEL: Record<EntryKind, L> = {
  deposit:       { en: 'Money in',          ar: 'مال داخل' },
  withdrawal:    { en: 'Money out',         ar: 'مال خارج' },
  transfer:      { en: 'Money moved',       ar: 'نقل مال' },
  expense:       { en: 'Cost paid',         ar: 'مصروف' },
  income:        { en: 'Income',            ar: 'دخل' },
  ib_commission: { en: 'Partner pay earned', ar: 'أجر شريك مستحق' },
  ib_payout:     { en: 'Partner paid',      ar: 'دفع لشريك' },
  payroll:       { en: 'Salaries',          ar: 'رواتب' },
  asset_buy:     { en: 'Bought something',  ar: 'شراء أصل' },
  depreciation:  { en: 'Wear and tear',     ar: 'استهلاك' },
  capital:       { en: "Owners' money",     ar: 'مال المالكين' },
  trade_pnl:     { en: 'Trading results',   ar: 'نتائج التداول' },
  manual:        { en: 'Written by hand',   ar: 'قيد يدوي' },
};

export const CLASS_LABEL: Record<ClientClassification, L & { tone: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  good:    { en: 'Good',       ar: 'جيد',         tone: 'success' },
  neutral: { en: 'New / normal', ar: 'جديد / عادي', tone: 'secondary' },
  bad:     { en: 'Be careful', ar: 'انتبه',       tone: 'warning' },
  fraud:   { en: 'Fraud',      ar: 'احتيال',      tone: 'destructive' },
};
