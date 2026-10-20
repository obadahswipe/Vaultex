import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useActingUser } from '@/lib/data/hooks';
import { isAdmin } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** Shows the page only to managers. Others see a short, friendly note instead. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const me = useActingUser();
  const { tr } = useTranslation();
  if (isAdmin(me.role)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-bold">{tr('Only managers can open this page', 'المدراء فقط يستطيعون فتح هذه الصفحة')}</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">{tr('Ask your manager if you need something changed here.', 'اطلب من مديرك إذا احتجت تغيير شيء هنا.')}</p>
      <Link to="/" className="mt-6 inline-block text-[14px] font-medium text-primary">{tr('Go to the home page', 'اذهب إلى الصفحة الرئيسية')}</Link>
    </div>
  );
}
