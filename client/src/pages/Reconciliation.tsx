import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Hourglass, AlertTriangle, Scale } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Segmented } from '@/components/shared/form';
import { useLedger, useReconciliation, type ReconRow } from '@/lib/data/hooks';
import { trialBalance } from '@/lib/data/ledger';
import { fmtMoney, fmtUSD, round2 } from '@/lib/data/money';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'check' | 'waiting' | 'match';

export default function Reconciliation() {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const recon = useReconciliation();
  const { accounts, usd, balances, entries, unbalanced } = useLedger();
  const tb = useMemo(() => trialBalance(accounts, usd), [accounts, usd]);
  const [filter, setFilter] = useState<Filter>(recon.toCheck ? 'check' : 'all');
  const [bankSays, setBankSays] = useState<Record<string, string>>({});

  const rows = recon.rows.filter((r) => filter === 'all' || r.status === filter)
    .sort((a, b) => Math.abs(b.unexplained) - Math.abs(a.unexplained) || Math.abs(b.difference) - Math.abs(a.difference));
  const balanced = unbalanced === 0 && Math.abs(tb.difference) < 0.05;

  const reason = (r: ReconRow) => {
    const parts: string[] = [];
    if (r.waitingRequests) parts.push(tr(`${fmtUSD(r.waitingRequests, 2)} sent on MT5, not in the books yet`, `${fmtUSD(r.waitingRequests, 2)} أُرسلت على MT5 ولم تُسجّل بعد`));
    if (r.waitingTrades) parts.push(tr(`${fmtUSD(r.waitingTrades, 2)} from today’s trades (booked when the day closes)`, `${fmtUSD(r.waitingTrades, 2)} من صفقات اليوم (تُسجّل عند إغلاق اليوم)`));
    if (Math.abs(r.unexplained) >= 0.01) parts.push(tr(`${fmtUSD(r.unexplained, 2)} nobody can explain — check it`, `${fmtUSD(r.unexplained, 2)} لا يوجد تفسير له — افحصه`));
    return parts;
  };

  const banks = accounts.filter((a) => (a.category === 'banks' || a.category === 'funds') && a.active);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Check the numbers', 'مطابقة الأرقام')}
        subtitle={tr('Make sure MT5, your banks and your books all say the same thing.', 'تأكد أن MT5 وبنوكك ودفاترك تقول الشيء نفسه.')}
        hint={
          <PageHint id="recon-v2" title={tr('Why does this matter?', 'لماذا هذا مهم؟')}>
            {tr('If MT5 shows a client has more money than your books, someone may have added money by mistake. Vaultex explains most differences for you. Only the red ones need a person to look.', 'إذا أظهر MT5 أن لدى الزبون مالًا أكثر من دفاترك، فربما أضاف أحدهم المال بالخطأ. فولتكس يفسر معظم الفروق لك. والحمراء فقط تحتاج شخصًا ليفحصها.')}
          </PageHint>
        }
      />

      <div className={cn('flex items-center gap-3 rounded-2xl border p-4', balanced ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}>
        <Scale className={cn('h-6 w-6 shrink-0', balanced ? 'text-success' : 'text-destructive')} />
        <div>
          <p className="font-semibold">{balanced ? tr('Your books are balanced', 'دفاترك متوازنة') : tr('Your books are not balanced', 'دفاترك غير متوازنة')}</p>
          <p className="text-[13px] text-muted-foreground">
            {balanced
              ? tr(`All ${entries.length} entries were checked one by one. Both sides add up to ${fmtUSD(tb.totalDebit, 2)}.`, `تم فحص كل القيود (${entries.length}) واحدًا واحدًا. مجموع كل جانب ${fmtUSD(tb.totalDebit, 2)}.`)
              : tr(`One side is ${fmtUSD(Math.abs(tb.difference), 2)} bigger. Look at the trial balance in Reports.`, `أحد الجانبين أكبر بمقدار ${fmtUSD(Math.abs(tb.difference), 2)}. راجع ميزان المراجعة في التقارير.`)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Clients’ money: books', 'أموال الزبائن: الدفاتر')} value={fmtUSD(recon.totalBooks)} icon={Scale} accent="blue" deltaLabel={tr(`MT5 says ${fmtUSD(recon.totalMt5)}`, `يقول MT5 ${fmtUSD(recon.totalMt5)}`)} />
        <StatCard label={tr('Match', 'متطابق')} value={recon.matched} icon={CheckCircle2} accent="green" deltaLabel={tr('Nothing to do', 'لا شيء لفعله')} onClick={() => setFilter('match')} />
        <StatCard label={tr('Waiting', 'ينتظر')} value={recon.waiting} icon={Hourglass} accent="amber" deltaLabel={tr('Explained, will fix itself', 'مُفسَّر وسيُصلَح وحده')} onClick={() => setFilter('waiting')} />
        <StatCard label={tr('Need a look', 'تحتاج فحصًا')} value={recon.toCheck} icon={AlertTriangle} accent="pink" deltaLabel={tr('Not explained', 'غير مُفسَّر')} onClick={() => setFilter('check')} />
      </div>

      <SectionCard padded={false} title={tr('MT5 vs books, for each client', 'MT5 مقابل الدفاتر لكل زبون')}>
        <div className="p-5 pt-4">
          <Segmented<Filter> value={filter} onChange={setFilter} options={[
            { value: 'check', label: tr('Need a look', 'تحتاج فحصًا'), count: recon.toCheck },
            { value: 'waiting', label: tr('Waiting', 'ينتظر'), count: recon.waiting },
            { value: 'match', label: tr('Match', 'متطابق'), count: recon.matched },
            { value: 'all', label: tr('All', 'الكل') },
          ]} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Client', 'الزبون')}</TableHead>
              <TableHead className="text-end">{tr('Books', 'الدفاتر')}</TableHead>
              <TableHead className="text-end">MT5</TableHead>
              <TableHead className="text-end">{tr('Difference', 'الفرق')}</TableHead>
              <TableHead className="hidden lg:table-cell">{tr('Why', 'السبب')}</TableHead>
              <TableHead>{tr('Result', 'النتيجة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.client.id} className="cursor-pointer" onClick={() => navigate(`/clients?account=${r.client.accountNo}`)}>
                <TableCell className="font-medium">{nameOf(r.client)}</TableCell>
                <TableCell className="text-end font-mono" dir="ltr">{fmtMoney(r.books, r.account?.currency)}</TableCell>
                <TableCell className="text-end font-mono" dir="ltr">{fmtMoney(r.mt5, r.account?.currency)}</TableCell>
                <TableCell className={cn('text-end font-mono font-semibold', Math.abs(r.difference) < 0.01 ? 'text-muted-foreground' : r.status === 'check' ? 'text-destructive' : 'text-warning')} dir="ltr">{fmtMoney(r.difference, r.account?.currency)}</TableCell>
                <TableCell className="hidden max-w-sm text-[12px] text-muted-foreground lg:table-cell">
                  {reason(r).map((p) => <p key={p}>• {p}</p>)}
                </TableCell>
                <TableCell>
                  {r.status === 'match' && <Badge variant="success">{tr('Match', 'متطابق')}</Badge>}
                  {r.status === 'waiting' && <Badge variant="warning">{tr('Waiting', 'ينتظر')}</Badge>}
                  {r.status === 'check' && <Badge variant="destructive">{tr('Check', 'افحص')}</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">{tr('Nothing here. Good job!', 'لا شيء هنا. أحسنت!')}</p>}
      </SectionCard>

      <SectionCard padded={false} title={tr('Banks and cash vs statements', 'البنوك والصناديق مقابل الكشوفات')} description={tr('Type what the bank statement or cash count says. Vaultex shows any difference.', 'اكتب ما يقوله كشف البنك أو عدّ الصندوق. وفولتكس يعرض أي فرق.')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('Money place', 'مكان المال')}</TableHead>
              <TableHead className="text-end">{tr('Books', 'الدفاتر')}</TableHead>
              <TableHead className="text-end">{tr('Statement says', 'الكشف يقول')}</TableHead>
              <TableHead className="text-end">{tr('Difference', 'الفرق')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((a) => {
              const typed = bankSays[a.code];
              const diff = typed ? round2(Number(typed) - (balances[a.code] ?? 0)) : null;
              return (
                <TableRow key={a.code}>
                  <TableCell><p className="font-medium">{nameOf(a)}</p><p className="text-[11px] text-muted-foreground">{a.currency}</p></TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{fmtMoney(balances[a.code] ?? 0, a.currency)}</TableCell>
                  <TableCell className="text-end">
                    <Input type="number" inputMode="decimal" className="ms-auto h-8 w-36 text-end" placeholder="—" value={typed ?? ''} onChange={(e) => setBankSays({ ...bankSays, [a.code]: e.target.value })} />
                  </TableCell>
                  <TableCell className={cn('text-end font-mono font-semibold', diff == null ? 'text-muted-foreground' : Math.abs(diff) < 0.01 ? 'text-success' : 'text-destructive')} dir="ltr">
                    {diff == null ? '—' : Math.abs(diff) < 0.01 ? tr('Match ✓', 'متطابق ✓') : fmtMoney(diff, a.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
