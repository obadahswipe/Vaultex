import {
  LayoutGrid, Inbox, Users, Network, HandCoins, TrendingUp, ShieldAlert, Landmark, Coins,
  WalletCards, ListTree, BookOpen, Scale, CalendarCheck, BarChart3, Clock, LineChart,
  UserCheck, MapPin, Crown, Package, MessageSquare, History, UserCog, Settings,
} from 'lucide-react';

export type NavIcon = typeof LayoutGrid;

export interface NavItem {
  to: string;
  icon: NavIcon;
  en: string;
  ar: string;
  /** One short sentence: what you do on this page. */
  helpEn: string;
  helpAr: string;
  badge?: 'pendingRequests' | 'alerts';
}

export interface NavSection {
  id: string;
  en: string;
  ar: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    id: 'start', en: '', ar: '',
    items: [
      { to: '/', icon: LayoutGrid, en: 'Home', ar: 'الرئيسية', helpEn: 'How your company is doing today.', helpAr: 'كيف حال شركتك اليوم.' },
    ],
  },
  {
    id: 'daily', en: 'Daily work', ar: 'العمل اليومي',
    items: [
      { to: '/operations', icon: Inbox, en: 'Money requests', ar: 'طلبات المال', helpEn: 'Clients asking to add or take out money.', helpAr: 'طلبات الزبائن لإضافة المال أو سحبه.', badge: 'pendingRequests' },
      { to: '/clients', icon: Users, en: 'Clients', ar: 'الزبائن', helpEn: 'Everyone who trades with you and their money.', helpAr: 'كل من يتداول معك وأمواله.' },
      { to: '/ib-mgmt', icon: Network, en: 'Partners (IBs)', ar: 'الشركاء (الوكلاء)', helpEn: 'People who bring you clients.', helpAr: 'الأشخاص الذين يحضرون لك الزبائن.' },
      { to: '/ib-commissions', icon: HandCoins, en: 'Partner pay', ar: 'أجور الشركاء', helpEn: 'How much each partner earned.', helpAr: 'كم ربح كل شريك.' },
      { to: '/trades', icon: TrendingUp, en: 'Trades', ar: 'الصفقات', helpEn: 'What your clients are buying and selling.', helpAr: 'ما يشتريه زبائنك وما يبيعونه.' },
      { to: '/risk', icon: ShieldAlert, en: 'Risk', ar: 'المخاطر', helpEn: 'How much you could win or lose right now.', helpAr: 'كم يمكن أن تربح أو تخسر الآن.' },
    ],
  },
  {
    id: 'money', en: 'Money', ar: 'المال',
    items: [
      { to: '/treasury', icon: Landmark, en: 'Banks and cash', ar: 'البنوك والصناديق', helpEn: 'How much money you have and where.', helpAr: 'كم لديك من المال وأين.' },
      { to: '/currency', icon: Coins, en: 'Exchange rates', ar: 'أسعار الصرف', helpEn: "Today's price of each currency.", helpAr: 'سعر كل عملة اليوم.' },
      { to: '/wallets', icon: WalletCards, en: 'Client wallets', ar: 'محافظ الزبائن', helpEn: 'Cards and wallets clients use to pay.', helpAr: 'البطاقات والمحافظ التي يدفع بها الزبائن.' },
    ],
  },
  {
    id: 'books', en: 'Books', ar: 'الدفاتر',
    items: [
      { to: '/entries', icon: ListTree, en: 'Entries', ar: 'القيود', helpEn: 'Every time money moved, written down.', helpAr: 'كل حركة مال، مكتوبة.' },
      { to: '/chart-of-accounts', icon: BookOpen, en: 'Accounts', ar: 'الحسابات', helpEn: 'The list of all your accounts and balances.', helpAr: 'قائمة كل حساباتك وأرصدتها.' },
      { to: '/reconciliation', icon: Scale, en: 'Check the numbers', ar: 'مطابقة الأرقام', helpEn: 'Make sure MT5 and your books say the same.', helpAr: 'تأكد أن MT5 ودفاترك متطابقان.' },
      { to: '/eod', icon: CalendarCheck, en: 'Close the day', ar: 'إغلاق اليوم', helpEn: 'Finish the day and lock it.', helpAr: 'أنهِ اليوم واقفله.' },
    ],
  },
  {
    id: 'reports', en: 'Reports', ar: 'التقارير',
    items: [
      { to: '/reports', icon: BarChart3, en: 'Profit and reports', ar: 'الأرباح والتقارير', helpEn: 'Did you make money? What do you own and owe?', helpAr: 'هل ربحت؟ ماذا تملك وماذا عليك؟' },
      { to: '/aging', icon: Clock, en: 'Who owes us', ar: 'من يدين لنا', helpEn: 'Clients and others who owe you money.', helpAr: 'الزبائن وغيرهم ممن يدينون لك.' },
      { to: '/ops-analytics', icon: LineChart, en: 'Charts', ar: 'الرسوم البيانية', helpEn: 'Your busiest days and biggest clients.', helpAr: 'أكثر أيامك عملًا وأكبر زبائنك.' },
    ],
  },
  {
    id: 'company', en: 'Company', ar: 'الشركة',
    items: [
      { to: '/hr', icon: UserCheck, en: 'Team and salaries', ar: 'الفريق والرواتب', helpEn: 'Your staff, days off and pay.', helpAr: 'موظفوك وإجازاتهم ورواتبهم.' },
      { to: '/branches', icon: MapPin, en: 'Branches', ar: 'الفروع', helpEn: 'Your offices.', helpAr: 'مكاتبك.' },
      { to: '/ownership', icon: Crown, en: 'Owners', ar: 'المالكون', helpEn: 'Who owns the company and their money in it.', helpAr: 'من يملك الشركة وأموالهم فيها.' },
      { to: '/assets', icon: Package, en: 'Things we own', ar: 'ممتلكات الشركة', helpEn: 'Computers, furniture and other things.', helpAr: 'الحواسيب والأثاث وغيرها.' },
      { to: '/crm', icon: MessageSquare, en: 'New clients and help', ar: 'زبائن جدد ودعم', helpEn: 'People who might join, and client questions.', helpAr: 'أشخاص قد ينضمون، وأسئلة الزبائن.' },
      { to: '/workflows', icon: History, en: 'Who did what', ar: 'من فعل ماذا', helpEn: 'A list of every action in the app.', helpAr: 'قائمة بكل ما حدث في التطبيق.' },
    ],
  },
  {
    id: 'admin', en: 'Settings', ar: 'الإعدادات',
    items: [
      { to: '/users', icon: UserCog, en: 'Staff logins', ar: 'حسابات الموظفين', helpEn: 'Who can sign in and what they can do.', helpAr: 'من يستطيع الدخول وماذا يستطيع أن يفعل.' },
      { to: '/settings/general', icon: Settings, en: 'Settings', ar: 'الإعدادات', helpEn: 'Company name, rules and payment methods.', helpAr: 'اسم الشركة والقواعد وطرق الدفع.' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((s) => s.items);

export function findNavItem(pathname: string) {
  if (pathname === '/') return ALL_NAV_ITEMS[0];
  return ALL_NAV_ITEMS
    .filter((i) => i.to !== '/' && (pathname === i.to || pathname.startsWith(i.to.split('/').slice(0, 2).join('/'))))
    .sort((a, b) => b.to.length - a.to.length)[0];
}
