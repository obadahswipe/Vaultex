import { useState } from 'react';
import { Plus, Package, TrendingDown, Laptop, Armchair, Car, Building, AppWindow } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, NativeSelect, attempt } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { useBooks } from '@/stores/books.store';
import { useActingUser } from '@/lib/data/hooks';
import { fmtUSD, round2 } from '@/lib/data/money';
import { PostingError } from '@/lib/data/ledger';
import { isAdmin } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FixedAsset } from '@/lib/data/types';

const KIND: Record<FixedAsset['kind'], { en: string; ar: string; icon: typeof Laptop; life: number }> = {
  computers: { en: 'Computers and screens', ar: 'حواسيب وشاشات', icon: Laptop, life: 36 },
  furniture: { en: 'Furniture',             ar: 'أثاث',          icon: Armchair, life: 60 },
  vehicles:  { en: 'Cars',                  ar: 'سيارات',        icon: Car, life: 60 },
  office:    { en: 'Office fit-out',        ar: 'تجهيز المكتب',  icon: Building, life: 84 },
  software:  { en: 'Software',              ar: 'برامج',         icon: AppWindow, life: 36 },
};

export default function Assets() {
  const { tr, nameOf } = useTranslation();
  const me = useActingUser();
  const assets = useBooks((s) => s.assets);
  const branches = useBooks((s) => s.branches);
  const addAsset = useBooks((s) => s.addAsset);
  const depreciateMonth = useBooks((s) => s.depreciateMonth);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', arabic: '', kind: 'computers' as FixedAsset['kind'], cost: '', life: '36', paidFrom: '1201', branchId: 'br-1' });

  const worth = (a: FixedAsset) => round2(a.cost - (a.cost / a.lifeMonths) * a.monthsDepreciated);
  const totalCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalWorth = assets.reduce((s, a) => s + worth(a), 0);
  const monthly = round2(assets.filter((a) => a.active && a.monthsDepreciated < a.lifeMonths).reduce((s, a) => s + a.cost / a.lifeMonths, 0));

  const save = () => {
    const ok = attempt(() => addAsset({ name: f.name.trim(), arabic: f.arabic || undefined, kind: f.kind, cost: Number(f.cost), boughtOn: new Date().toISOString().slice(0, 10), lifeMonths: Number(f.life) || 36, branchId: f.branchId }, f.paidFrom, me.email), tr('Bought and written in the books', 'تم الشراء والتسجيل في الدفاتر'));
    if (ok) { setOpen(false); setF({ ...f, name: '', arabic: '', cost: '' }); }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Things we own', 'ممتلكات الشركة')}
        subtitle={tr('Computers, furniture and other things the company bought.', 'الحواسيب والأثاث وغيرها مما اشترته الشركة.')}
        hint={<PageHint id="assets-v2" title={tr('What is "wear and tear"?', 'ما هو "الاستهلاك"؟')}>{tr('Things lose value as they get older. Each month, Vaultex counts a small part of their price as a cost. Press "Count this month’s wear" once a month.', 'تفقد الأشياء قيمتها مع الوقت. كل شهر يحسب فولتكس جزءًا صغيرًا من ثمنها كمصروف. اضغط "احسب استهلاك هذا الشهر" مرة في الشهر.')}</PageHint>}
        actions={isAdmin(me.role) && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => attempt(() => { const n = depreciateMonth(me.email); if (!n) throw new PostingError('There is nothing to count this month.', 'لا يوجد شيء للحساب هذا الشهر.'); }, tr(`Wear and tear of ${fmtUSD(monthly, 2)} written in the books`, `سُجّل استهلاك بقيمة ${fmtUSD(monthly, 2)} في الدفاتر`))}>
              <TrendingDown className="h-4 w-4" />{tr("Count this month's wear", 'احسب استهلاك هذا الشهر')}
            </Button>
            <Button variant="gradient" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{tr('We bought something', 'اشترينا شيئًا')}</Button>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tr('Paid for them', 'دفعنا ثمنها')} value={fmtUSD(totalCost)} icon={Package} accent="blue" deltaLabel={tr(`${assets.length} things`, `${assets.length} أشياء`)} />
        <StatCard label={tr('Worth today', 'قيمتها اليوم')} value={fmtUSD(totalWorth)} icon={Package} accent="violet" deltaLabel={tr('After wear and tear', 'بعد الاستهلاك')} />
        <StatCard label={tr('Wear each month', 'الاستهلاك الشهري')} value={fmtUSD(monthly, 2)} icon={TrendingDown} accent="amber" deltaLabel={tr('Counted as a cost', 'يُحسب كمصروف')} />
      </div>

      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Thing', 'الشيء')}</TableHead>
              <TableHead className="hidden md:table-cell">{tr('Branch', 'الفرع')}</TableHead>
              <TableHead className="text-end">{tr('Price', 'الثمن')}</TableHead>
              <TableHead className="hidden text-end sm:table-cell">{tr('Lasts', 'يدوم')}</TableHead>
              <TableHead className="text-end">{tr('Worth today', 'قيمته اليوم')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => {
              const k = KIND[a.kind];
              const pct = Math.round((worth(a) / a.cost) * 100);
              const b = branches.find((x) => x.id === a.branchId);
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="flex items-center gap-2 font-medium"><k.icon className="h-4 w-4 text-muted-foreground" />{nameOf(a)}</p>
                    <p className="text-[11px] text-muted-foreground">{tr(k.en, k.ar)} · {tr('bought', 'اشتُري')} {a.boughtOn}</p>
                  </TableCell>
                  <TableCell className="hidden text-[13px] md:table-cell">{b ? nameOf({ name: b.name, arabic: b.arabic }) : '—'}</TableCell>
                  <TableCell className="text-end font-mono">{fmtUSD(a.cost)}</TableCell>
                  <TableCell className="hidden text-end text-[13px] sm:table-cell">{tr(`${a.lifeMonths / 12} years`, `${a.lifeMonths / 12} سنوات`)}</TableCell>
                  <TableCell className="text-end">
                    <p className="font-mono font-semibold">{fmtUSD(worth(a))}</p>
                    <div className="ms-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('We bought something', 'اشترينا شيئًا')}</DialogTitle>
            <DialogDescription>{tr('Vaultex takes the money out of the bank or cash box and adds the thing to what you own.', 'فولتكس يخرج المال من البنك أو الصندوق ويضيف الشيء إلى ممتلكاتك.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('What is it?', 'ما هو؟')}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tr('e.g. 4 new laptops', 'مثال: 4 حواسيب محمولة')} /></Field>
            <Field label={tr('Name in Arabic', 'الاسم بالعربية')}><Input dir="rtl" value={f.arabic} onChange={(e) => setF({ ...f, arabic: e.target.value })} /></Field>
            <Field label={tr('Kind', 'النوع')}>
              <NativeSelect value={f.kind} onChange={(e) => { const k = e.target.value as FixedAsset['kind']; setF({ ...f, kind: k, life: String(KIND[k].life) }); }}>
                {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{tr(v.en, v.ar)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Price (USD)', 'الثمن (دولار)')}><Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
            <Field label={tr('How many months will it last?', 'كم شهرًا سيدوم؟')}><Input type="number" value={f.life} onChange={(e) => setF({ ...f, life: e.target.value })} /></Field>
            <Field label={tr('Branch', 'الفرع')}>
              <NativeSelect value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
                {branches.map((b) => <option key={b.id} value={b.id}>{nameOf({ name: b.name, arabic: b.arabic })}</option>)}
              </NativeSelect>
            </Field>
            <Field label={tr('Paid from', 'دُفع من')} className="sm:col-span-2"><AccountPicker value={f.paidFrom} onChange={(v) => setF({ ...f, paidFrom: v })} categories={['banks', 'funds']} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr('Cancel', 'إلغاء')}</Button>
            <Button variant="gradient" disabled={!f.name.trim() || !(Number(f.cost) > 0)} onClick={save}>{tr('Save', 'حفظ')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
