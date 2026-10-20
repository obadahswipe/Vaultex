import { useMemo, useState } from 'react';
import { RefreshCw, Pencil, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { TrendChart } from '@/components/shared/TrendChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field, NativeSelect } from '@/components/shared/form';
import { useBooks } from '@/stores/books.store';
import { useDailyRates } from '@/hooks/useLiveRates';
import { CURRENCY_LABEL, crossRate, fmtMoney } from '@/lib/data/money';
import { CURRENCIES, type Currency } from '@/lib/data/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const FIXED: Currency[] = ['USD', 'USDT', 'AED', 'SAR'];

export default function CurrencyPage() {
  const { tr, lang } = useTranslation();
  const rates = useBooks((s) => s.rates);
  const history = useBooks((s) => s.rateHistory);
  const setRates = useBooks((s) => s.setRates);
  const { loading, error, updatedAt, refresh } = useDailyRates();
  const [editing, setEditing] = useState<Currency | null>(null);
  const [draft, setDraft] = useState('');
  const [chartCur, setChartCur] = useState<Currency>('TRY');
  const [conv, setConv] = useState({ amount: '1000', from: 'USD' as Currency, to: 'TRY' as Currency });

  const weekAgo = useMemo(() => {
    const target = new Date(); target.setDate(target.getDate() - 7);
    const iso = target.toISOString().slice(0, 10);
    return [...history].reverse().find((h) => h.date <= iso)?.rates ?? {};
  }, [history]);

  const series = useMemo(() => history
    .filter((h) => h.rates[chartCur])
    .map((h) => ({ label: h.date.slice(5), value: Number((1 / (h.rates[chartCur] as number)).toFixed(chartCur === 'TRY' ? 3 : 4)) })), [history, chartCur]);

  const onRefresh = async () => {
    const ok = await refresh();
    toast({
      title: ok ? tr("Today's rates are in", 'وصلت أسعار اليوم') : tr('Could not get the rates', 'تعذّر جلب الأسعار'),
      description: ok ? undefined : tr('Check your internet and try again. You can also type a rate yourself.', 'تحقق من الإنترنت وحاول مرة أخرى. ويمكنك أيضًا كتابة السعر بنفسك.'),
      variant: ok ? 'default' : 'destructive',
    });
  };

  const saveEdit = (c: Currency) => {
    const perUsd = Number(draft);
    if (perUsd > 0) { setRates({ [c]: 1 / perUsd }); toast({ title: tr('Rate saved', 'تم حفظ السعر') }); }
    setEditing(null);
  };

  const converted = Number(conv.amount) * crossRate(conv.from, conv.to, rates);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Exchange rates', 'أسعار الصرف')}
        subtitle={tr('Vaultex uses these prices to show all your money in dollars.', 'يستخدم فولتكس هذه الأسعار ليعرض كل أموالك بالدولار.')}
        hint={
          <PageHint id="rates-v2" title={tr('Where do the rates come from?', 'من أين تأتي الأسعار؟')}>
            {tr('Press "Get today’s rates" to load the daily rates from the European Central Bank. The dirham and riyal are tied to the dollar, so they do not change. You can also type your own rate.', 'اضغط "اجلب أسعار اليوم" لتحميل الأسعار اليومية من البنك المركزي الأوروبي. الدرهم والريال مربوطان بالدولار فلا يتغيران. ويمكنك أيضًا كتابة سعرك.')}
          </PageHint>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button variant="gradient" className="gap-1.5" disabled={loading} onClick={onRefresh}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{tr("Get today's rates", 'اجلب أسعار اليوم')}
            </Button>
            <span className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')}>
              {updatedAt
                ? tr(`Updated ${new Date(updatedAt).toLocaleString('en-GB')}`, `آخر تحديث ${new Date(updatedAt).toLocaleString('ar')}`)
                : tr('Using saved sample rates', 'تُستخدم أسعار تجريبية محفوظة')}
            </span>
          </div>
        }
      />

      <SectionCard padded={false} title={tr("Today's prices", 'أسعار اليوم')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Currency', 'العملة')}</TableHead>
              <TableHead className="text-end">{tr('1 US dollar buys', 'الدولار الواحد يساوي')}</TableHead>
              <TableHead className="hidden text-end sm:table-cell">{tr('1 unit is worth', 'الوحدة الواحدة تساوي')}</TableHead>
              <TableHead className="hidden text-end md:table-cell">{tr('Change in 7 days', 'التغير خلال 7 أيام')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {CURRENCIES.filter((c) => c !== 'USD').map((c) => {
              const perUsd = 1 / rates[c];
              const old = weekAgo[c] ? 1 / (weekAgo[c] as number) : undefined;
              const change = old ? ((perUsd - old) / old) * 100 : undefined;
              const fixed = FIXED.includes(c);
              return (
                <TableRow key={c}>
                  <TableCell>
                    <p className="font-medium"><span className="me-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold">{c}</span>{lang === 'ar' ? CURRENCY_LABEL[c].ar : CURRENCY_LABEL[c].en}</p>
                    {fixed && <p className="text-[11px] text-muted-foreground">{tr('Tied to the dollar', 'مربوط بالدولار')}</p>}
                  </TableCell>
                  <TableCell className="text-end font-mono font-semibold" dir="ltr">
                    {editing === c ? (
                      <span className="inline-flex items-center gap-1">
                        <Input autoFocus className="h-8 w-28 text-end" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)} />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => saveEdit(c)}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      </span>
                    ) : `${perUsd.toFixed(c === 'TRY' ? 3 : 4)} ${c}`}
                  </TableCell>
                  <TableCell className="hidden text-end font-mono sm:table-cell" dir="ltr">{rates[c].toFixed(4)} USD</TableCell>
                  <TableCell className={cn('hidden text-end font-mono md:table-cell', change == null ? '' : change > 0 ? 'text-destructive' : 'text-success')} dir="ltr">
                    {change == null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`}
                  </TableCell>
                  <TableCell className="text-end">
                    {editing !== c && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" title={tr('Type my own rate', 'اكتب سعري')} onClick={() => { setEditing(c); setDraft(perUsd.toFixed(4)); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title={tr(`1 US dollar in ${chartCur} — last 30 days`, `الدولار الواحد بالـ ${chartCur} — آخر 30 يومًا`)}
          action={
            <NativeSelect value={chartCur} onChange={(e) => setChartCur(e.target.value as Currency)} className="h-8 w-auto">
              {(['TRY', 'EUR', 'GBP'] as Currency[]).map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          }
        >
          <div dir="ltr"><TrendChart data={series} height={240} formatValue={(n) => n.toFixed(chartCur === 'TRY' ? 2 : 4)} /></div>
        </SectionCard>

        <SectionCard title={tr('Quick converter', 'محوّل سريع')}>
          <div className="space-y-3">
            <Field label={tr('Amount', 'المبلغ')}><Input type="number" value={conv.amount} onChange={(e) => setConv({ ...conv, amount: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('From', 'من')}>
                <NativeSelect value={conv.from} onChange={(e) => setConv({ ...conv, from: e.target.value as Currency })}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </Field>
              <Field label={tr('To', 'إلى')}>
                <NativeSelect value={conv.to} onChange={(e) => setConv({ ...conv, to: e.target.value as Currency })}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <div className="rounded-xl bg-primary/5 p-4 text-center">
              <p className="text-[12px] text-muted-foreground">{tr('You get', 'تحصل على')}</p>
              <p className="font-mono text-2xl font-bold" dir="ltr">{fmtMoney(Number.isFinite(converted) ? converted : 0, conv.to)}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
