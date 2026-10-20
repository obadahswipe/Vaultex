import { SectionCard } from '@/components/shared/SectionCard';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useTranslation } from '@/lib/i18n/useTranslation';

function Rule({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="text-[14px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{help}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function OperationsSettings() {
  const { tr } = useTranslation();
  const ops = useBooks((s) => s.ops);
  const updateOps = useBooks((s) => s.updateOps);
  return (
    <SectionCard title={tr('Money rules', 'قواعد المال')} description={tr('Rules every money request must follow.', 'قواعد يجب أن يتبعها كل طلب مال.')}>
      <div className="divide-y divide-border/40">
        <Rule
          title={tr('Two different people must say OK', 'يجب أن يوافق شخصان مختلفان')}
          help={tr('The person who makes a request cannot also say OK to it. This stops mistakes and fraud. We strongly suggest keeping it on.', 'من ينشئ الطلب لا يستطيع أن يوافق عليه أيضًا. هذا يمنع الأخطاء والاحتيال. ننصح بشدة بإبقائه مفعّلًا.')}
        >
          <Toggle checked={ops.requireDifferentConfirmer} onChange={(v) => updateOps({ requireDifferentConfirmer: v })} />
        </Rule>
        <Rule
          title={tr('Show MT5 steps to the cashier', 'اعرض خطوات MT5 لأمين الصندوق')}
          help={tr('After an OK, show the MT5 account number and amount with copy buttons, so nothing is typed wrong.', 'بعد الموافقة، اعرض رقم حساب MT5 والمبلغ مع أزرار النسخ، حتى لا يُكتب شيء خطأ.')}
        >
          <Toggle checked={ops.manualMT5Execution} onChange={(v) => updateOps({ manualMT5Execution: v })} />
        </Rule>
        <Rule
          title={tr('A request is "late" after (hours)', 'يصبح الطلب "متأخرًا" بعد (ساعات)')}
          help={tr('Vaultex warns you when a request waits longer than this.', 'فولتكس ينبهك عندما ينتظر الطلب أكثر من هذا.')}
        >
          <Input type="number" min={1} className="w-24 text-end" value={ops.urgentThresholdHours} onChange={(e) => updateOps({ urgentThresholdHours: Math.max(1, Number(e.target.value) || 1) })} />
        </Rule>
        <Rule
          title={tr('A request is "big" from (USD)', 'يصبح الطلب "كبيرًا" من (دولار)')}
          help={tr('Big requests get a warning so someone checks them carefully.', 'الطلبات الكبيرة تحصل على تنبيه حتى يراجعها أحد بعناية.')}
        >
          <Input type="number" min={0} className="w-32 text-end" value={ops.largeTransactionThreshold} onChange={(e) => updateOps({ largeTransactionThreshold: Math.max(0, Number(e.target.value) || 0) })} />
        </Rule>
      </div>
    </SectionCard>
  );
}
