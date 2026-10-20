import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Users, BadgeDollarSign } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLedger } from '@/lib/data/hooks';
import { lineEffect } from '@/lib/data/ledger';
import { fmtMoney, fmtUSD, round2, toUSD } from '@/lib/data/money';
import { CATEGORY_LABEL } from '@/lib/data/labels';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Account } from '@/lib/data/types';

type Bucket = '0-30' | '31-60' | '61-90' | '90+';
const BUCKETS: Bucket[] = ['0-30', '31-60', '61-90', '90+'];

export default function AgingReport() {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const { accounts, entries, balances, rates } = useLedger();

  const rows = useMemo(() => {
    const today = Date.now();
    const out: { acc: Account; owed: number; usd: number; since?: string; days: number; bucket: Bucket }[] = [];
    for (const acc of accounts) {
      const bal = balances[acc.code] ?? 0;
      // Clients owe us when their balance is below zero. Staff owe us their loans.
      const owed = acc.category === 'clients' ? -bal : acc.category === 'staff' ? bal : 0;
      if (owed <= 0.005) continue;
      // Walk forward to find when the debt started (the last time the balance crossed zero).
      let running = acc.opening;
      let since: string | undefined = (acc.category === 'clients' ? -running : running) > 0 ? undefined : '';
      for (const e of entries) {
        const lines = e.lines.filter((l) => l.accountCode === acc.code);
        if (!lines.length) continue;
        const before = acc.category === 'clients' ? -running : running;
        running += lines.reduce((s, l) => s + lineEffect(acc, l), 0);
        const after = acc.category === 'clients' ? -running : running;
        if (before <= 0 && after > 0) since = e.date;
      }
      const days = since ? Math.max(0, Math.floor((today - new Date(since).getTime()) / 86_400_000)) : 120;
      const bucket: Bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      out.push({ acc, owed: round2(owed), usd: round2(toUSD(owed, acc.currency, rates)), since: since || undefined, days, bucket });
    }
    return out.sort((a, b) => b.days - a.days);
  }, [accounts, entries, balances, rates]);

  const byBucket = BUCKETS.map((b) => ({ b, total: round2(rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.usd, 0)), count: rows.filter((r) => r.bucket === b).length }));
  const total = round2(rows.reduce((s, r) => s + r.usd, 0));
  const tone: Record<Bucket, string> = { '0-30': 'bg-success', '31-60': 'bg-warning', '61-90': 'bg-orange-500', '90+': 'bg-destructive' };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Who owes us', 'من يدين لنا')}
        subtitle={tr('Clients and staff who owe the company money, and for how long.', 'الزبائن والموظفون الذين يدينون للشركة بالمال، ومنذ متى.')}
        hint={
          <PageHint id="aging-v2" title={tr('Why does "how long" matter?', 'لماذا "منذ متى" مهم؟')}>
            {tr('The longer someone owes you, the harder it is to get the money back. Call the people in red first.', 'كلما طالت مدة الدين، صعب استرداد المال. اتصل بأصحاب اللون الأحمر أولًا.')}
          </PageHint>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Owed to you', 'مستحق لك')} value={fmtUSD(total)} icon={BadgeDollarSign} accent="blue" deltaLabel={tr(`${rows.length} people`, `${rows.length} أشخاص`)} />
        <StatCard label={tr('Clients', 'زبائن')} value={rows.filter((r) => r.acc.category === 'clients').length} icon={Users} accent="violet" deltaLabel={tr('Balance below zero', 'رصيد تحت الصفر')} />
        <StatCard label={tr('Staff loans', 'سلف الموظفين')} value={rows.filter((r) => r.acc.category === 'staff').length} icon={Clock} accent="amber" deltaLabel={tr('Will be paid back', 'ستُسدد')} />
        <StatCard label={tr('Over 90 days', 'أكثر من 90 يومًا')} value={fmtUSD(byBucket[3].total)} icon={AlertTriangle} accent="pink" deltaLabel={tr('Hardest to get back', 'الأصعب استردادًا')} />
      </div>

      <SectionCard title={tr('How old is the money owed?', 'كم عمر الديون؟')}>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          {byBucket.map(({ b, total: t }) => total > 0 && t > 0 && <div key={b} className={tone[b]} style={{ width: `${(t / total) * 100}%` }} />)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {byBucket.map(({ b, total: t, count }) => (
            <div key={b} className="rounded-xl border border-border/60 p-3">
              <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><span className={cn('h-2 w-2 rounded-full', tone[b])} />{tr(`${b} days`, `${b} يومًا`)}</p>
              <p className="font-mono text-lg font-bold">{fmtUSD(t)}</p>
              <p className="text-[11px] text-muted-foreground">{tr(`${count} people`, `${count} أشخاص`)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard padded={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Who', 'من')}</TableHead>
              <TableHead className="hidden sm:table-cell">{tr('Kind', 'النوع')}</TableHead>
              <TableHead className="text-end">{tr('Owes', 'يدين')}</TableHead>
              <TableHead className="text-end">{tr('For', 'منذ')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.acc.code} className="cursor-pointer" onClick={() => navigate(`/entries?account=${r.acc.code}`)}>
                <TableCell className="font-medium">{nameOf(r.acc)}</TableCell>
                <TableCell className="hidden text-[13px] text-muted-foreground sm:table-cell">{tr(CATEGORY_LABEL[r.acc.category].en, CATEGORY_LABEL[r.acc.category].ar)}</TableCell>
                <TableCell className="text-end font-mono font-semibold" dir="ltr">{fmtMoney(r.owed, r.acc.currency)}</TableCell>
                <TableCell className="text-end">
                  <span className={cn('inline-flex items-center gap-1.5 text-[13px]')}>
                    <span className={cn('h-2 w-2 rounded-full', tone[r.bucket])} />
                    {r.since ? tr(`${r.days} days`, `${r.days} يومًا`) : tr('Before our records', 'قبل سجلاتنا')}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('Nobody owes you money. 🎉', 'لا أحد يدين لك بالمال. 🎉')}</p>}
      </SectionCard>
    </div>
  );
}
