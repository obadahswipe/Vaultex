import { NavLink, Outlet } from 'react-router-dom';
import { Building2, ShieldCheck, Tags, Plug } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { tr } = useTranslation();
  const tabs = [
    { to: '/settings/general',    icon: Building2,   label: tr('Company', 'الشركة') },
    { to: '/settings/operations', icon: ShieldCheck, label: tr('Money rules', 'قواعد المال') },
    { to: '/settings/symbols',    icon: Tags,        label: tr('What clients can trade', 'ما يمكن للزبائن تداوله') },
    { to: '/settings/gateways',   icon: Plug,        label: tr('Ways to pay', 'طرق الدفع') },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={tr('Settings', 'الإعدادات')} subtitle={tr('Your company details and the rules Vaultex follows.', 'بيانات شركتك والقواعد التي يتبعها فولتكس.')} />
      <div className="flex flex-wrap gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
