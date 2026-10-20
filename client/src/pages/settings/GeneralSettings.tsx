import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { CURRENCIES, type Currency } from '@/lib/data/types';

const ZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Amman', 'Europe/Istanbul', 'Asia/Baghdad', 'Africa/Cairo', 'Europe/London', 'UTC'];

export default function GeneralSettings() {
  const { tr } = useTranslation();
  const general = useBooks((s) => s.general);
  const closedThrough = useBooks((s) => s.closedThrough);
  const updateGeneral = useBooks((s) => s.updateGeneral);
  const resetDemo = useBooks((s) => s.resetDemo);
  const [f, setF] = useState(general);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title={tr('Company details', 'بيانات الشركة')}>
        <div className="space-y-4">
          <Field label={tr('Company name', 'اسم الشركة')}><Input value={f.brokerName} onChange={(e) => setF({ ...f, brokerName: e.target.value })} /></Field>
          <Field label={tr('Time zone', 'المنطقة الزمنية')} help={tr('Used to decide when a day starts and ends.', 'تُستخدم لتحديد بداية اليوم ونهايته.')}>
            <NativeSelect value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </NativeSelect>
          </Field>
          <Field label={tr('Main currency for reports', 'العملة الرئيسية للتقارير')} help={tr('Reports are shown in US dollars today.', 'تُعرض التقارير بالدولار الأمريكي حاليًا.')}>
            <NativeSelect value={f.defaultCurrency} onChange={(e) => setF({ ...f, defaultCurrency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </Field>
          <Button variant="gradient" onClick={() => attempt(() => updateGeneral(f), tr('Saved', 'تم الحفظ'))}>{tr('Save', 'حفظ')}</Button>
        </div>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard title={tr('Locked days', 'الأيام المقفلة')}>
          <p className="text-[14px]">{tr(`Every day up to ${closedThrough} is closed and locked.`, `كل الأيام حتى ${closedThrough} مغلقة ومقفلة.`)}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{tr('Close more days on the "Close the day" page. Locked days can never be opened again.', 'أغلق أيامًا أخرى من صفحة "إغلاق اليوم". الأيام المقفلة لا تُفتح مرة أخرى أبدًا.')}</p>
        </SectionCard>
        <SectionCard title={tr('Sample data', 'البيانات التجريبية')}>
          <p className="text-[13px] text-muted-foreground">{tr('This demo uses a made-up company. Start again with fresh sample data at any time.', 'هذه النسخة التجريبية تستخدم شركة وهمية. ابدأ من جديد ببيانات تجريبية جديدة في أي وقت.')}</p>
          <Button variant="outline" className="mt-3 gap-1.5" onClick={() => { if (window.confirm(tr('Remove your changes and start again?', 'هل تريد حذف تغييراتك والبدء من جديد؟'))) { resetDemo(); setF(useBooks.getState().general); } }}>
            <RotateCcw className="h-4 w-4" />{tr('Start fresh', 'ابدأ من جديد')}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
