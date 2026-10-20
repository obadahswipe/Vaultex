import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Timer, Inbox, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageHint } from '@/components/shared/PageHint';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { useBooks } from '@/stores/books.store';
import { useLedger } from '@/lib/data/hooks';
import { profitAndLoss } from '@/lib/data/ledger';
import { REQUEST_TYPE_LABEL } from '@/lib/data/labels';
import { fmtShort, fmtUSD, round2, toUSD } from '@/lib/data/money';
import { daysAgo } from '@/lib/data/seed';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { RequestType } from '@/lib/data/types';

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#0ea5e9', '#a855f7', '#64748b'];
const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 };
const axis = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function OperationsAnalytics() {
  const { tr, nameOf } = useTranslation();
  const requests = useBooks((s) => s.requests);
  const clients = useBooks((s) => s.clients);
  const { accounts, entries, rates } = useLedger();

  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => daysAgo(29 - i)), []);

  const perDay = useMemo(() => days.map((d) => ({ day: d.slice(5), count: requests.filter((r) => r.date === d).length })), [days, requests]);

  const profitPerDay = useMemo(() => days.map((d) => ({ day: d.slice(5), profit: profitAndLoss(accounts, entries, d, d).profit })), [days, accounts, entries]);

  const byKind = useMemo(() => {
    const m = new Map<RequestType, number>();
    for (const r of requests) if (r.date >= days[0]) m.set(r.type, (m.get(r.type) ?? 0) + 1);
    return [...m.entries()].map(([k, v]) => ({ name: tr(REQUEST_TYPE_LABEL[k].en, REQUEST_TYPE_LABEL[k].ar), value: v }));
  }, [requests, days, tr]);

  const topClients = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== 'voucher' || r.type !== 'deposit' || r.date < days[0]) continue;
      for (const l of r.lines) m.set(l.accountNo, (m.get(l.accountNo) ?? 0) + toUSD(l.amount, l.currency, rates));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([code, v]) => ({ name: nameOf(clients.find((c) => c.accountNo === code)), value: round2(v) }));
  }, [requests, rates, clients, days, nameOf]);

  const done = requests.filter((r) => r.status === 'voucher' && r.timeline.length >= 2);
  const avgHours = done.length
    ? done.reduce((s, r) => s + (new Date(r.timeline[r.timeline.length - 1].at).getTime() - new Date(r.timeline[0].at).getTime()) / 3_600_000, 0) / done.length
    : 0;
  const monthProfit = profitPerDay.reduce((s, d) => s + d.profit, 0);
  const deposits30 = requests.filter((r) => r.type === 'deposit' && r.status === 'voucher' && r.date >= days[0]).reduce((s, r) => s + r.lines.reduce((x, l) => x + toUSD(l.amount, l.currency, rates), 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr('Charts', 'الرسوم البيانية')}
        subtitle={tr('The last 30 days in pictures.', 'آخر 30 يومًا بالصور.')}
        hint={<PageHint id="charts-v2" title={tr('Tip', 'نصيحة')}>{tr('Move your mouse over a bar to see the exact number.', 'مرّر الفأرة فوق العمود لترى الرقم بالضبط.')}</PageHint>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr('Money requests', 'طلبات المال')} value={perDay.reduce((s, d) => s + d.count, 0)} icon={Inbox} accent="blue" deltaLabel={tr('In 30 days', 'في 30 يومًا')} />
        <StatCard label={tr('Time to finish a request', 'وقت إنهاء الطلب')} value={tr(`${avgHours.toFixed(1)} h`, `${avgHours.toFixed(1)} س`)} icon={Timer} accent="violet" deltaLabel={tr('From made to written in the books', 'من الإنشاء إلى التسجيل')} />
        <StatCard label={tr('Money added by clients', 'مال أضافه الزبائن')} value={fmtShort(deposits30)} icon={Users} accent="green" deltaLabel={tr('In 30 days', 'في 30 يومًا')} />
        <StatCard label={tr('Profit', 'الربح')} value={fmtShort(monthProfit)} icon={TrendingUp} accent={monthProfit >= 0 ? 'green' : 'pink'} deltaLabel={tr('In 30 days', 'في 30 يومًا')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={tr('Requests each day', 'الطلبات كل يوم')}>
          <div className="h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name={tr('Requests', 'طلبات')} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title={tr('Profit each day', 'الربح كل يوم')}>
          <div className="h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axis} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtShort(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} />
                <Line type="monotone" dataKey="profit" name={tr('Profit', 'الربح')} stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title={tr('Kinds of requests', 'أنواع الطلبات')}>
          <div className="h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byKind} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {byKind.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
            {byKind.map((k, i) => <span key={k.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{k.name} ({k.value})</span>)}
          </div>
        </SectionCard>

        <SectionCard title={tr('Clients who added the most money', 'الزبائن الأكثر إضافة للمال')}>
          <div className="h-60" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(v)} />
                <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtUSD(Number(v))} />
                <Bar dataKey="value" name={tr('Added', 'أضاف')} fill="hsl(var(--success))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
