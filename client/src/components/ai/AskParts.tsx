// Pieces of an Ask Vaultex answer: formatted text, charts, draft requests, page buttons.
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight, BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { showError } from '@/components/shared/form';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBooks } from '@/stores/books.store';
import { useActingUser } from '@/lib/data/hooks';
import { fmtMoney, fmtShort, fmtUSD } from '@/lib/data/money';
import { REQUEST_TYPE_LABEL } from '@/lib/data/labels';
import { useAskVaultex } from '@/lib/ai/chat.store';
import type { ChartSpec, DraftSpec } from '@/lib/ai/runTool';
import { cn } from '@/lib/utils';

// ─── Text ────────────────────────────────────────────────────────────────────

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        ul: ({ children }) => <ul className="my-2 space-y-1 ps-5 list-disc marker:text-primary/60">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 space-y-1 ps-5 list-decimal marker:text-muted-foreground">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        h1: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-bold">{children}</h3>,
        h2: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-bold">{children}</h3>,
        h3: ({ children }) => <h4 className="mt-3 mb-1 text-[14px] font-semibold">{children}</h4>,
        a: ({ children, href }) => <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
        code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{children}</code>,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-[12.5px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/60 text-muted-foreground">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-start font-semibold whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="border-t border-border/40 px-3 py-2 tabular-nums">{children}</td>,
        hr: () => <hr className="my-3 border-border/50" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

// ─── Chart ───────────────────────────────────────────────────────────────────

const COLORS = ['hsl(var(--primary))', 'hsl(262 83% 62%)', 'hsl(152 60% 42%)', 'hsl(35 92% 55%)', 'hsl(340 75% 58%)', 'hsl(190 80% 45%)', 'hsl(var(--muted-foreground))'];

function fmtValue(v: number, unit?: ChartSpec['unit']) {
  if (unit === 'usd') return fmtShort(v);
  if (unit === 'percent') return `${v}%`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function AskChart({ chart }: { chart: ChartSpec }) {
  const names = chart.series?.length ? chart.series : ['Value'];
  const two = chart.data.some((d) => d.value2 !== undefined);
  const tip = {
    formatter: (v: unknown) => (chart.unit === 'usd' ? fmtUSD(Number(v)) : fmtValue(Number(v), chart.unit)),
    contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 },
  };
  const axis = { tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, axisLine: false, tickLine: false };
  return (
    <figure className="mt-3 rounded-2xl border border-border/60 bg-card p-3">
      <figcaption className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />{chart.title}
      </figcaption>
      <div className="h-52 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === 'pie' ? (
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="82%" paddingAngle={2} stroke="none">
                {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : chart.kind === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} width={52} tickFormatter={(v) => fmtValue(v, chart.unit)} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="value" name={names[0]} stroke={COLORS[0]} strokeWidth={2.4} dot={false} />
              {two && <Line type="monotone" dataKey="value2" name={names[1] ?? ''} stroke={COLORS[1]} strokeWidth={2.4} dot={false} />}
              {two && <Legend wrapperStyle={{ fontSize: 11 }} />}
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={0} tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + '…' : v)} />
              <YAxis {...axis} width={52} tickFormatter={(v) => fmtValue(v, chart.unit)} />
              <Tooltip {...tip} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
              <Bar dataKey="value" name={names[0]} fill={COLORS[0]} radius={[6, 6, 0, 0]} />
              {two && <Bar dataKey="value2" name={names[1] ?? ''} fill={COLORS[1]} radius={[6, 6, 0, 0]} />}
              {two && <Legend wrapperStyle={{ fontSize: 11 }} />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

// ─── Draft request ───────────────────────────────────────────────────────────

export function DraftCard({ draft, createdNo, messageId, index }: { draft: DraftSpec; createdNo?: number; messageId: string; index: number }) {
  const { tr, nameOf } = useTranslation();
  const navigate = useNavigate();
  const addRequest = useBooks((s) => s.addRequest);
  const markCreated = useAskVaultex((s) => s.markCreated);
  const setOpen = useAskVaultex((s) => s.setOpen);
  const me = useActingUser();
  const [busy, setBusy] = useState(false);
  const label = REQUEST_TYPE_LABEL[draft.type];
  const incoming = draft.type === 'deposit' || draft.type === 'ib_deposit';
  const converted = draft.askedCurrency !== draft.account.currency;

  const create = () => {
    setBusy(true);
    try {
      const req = addRequest({
        type: draft.type,
        date: new Date().toISOString().slice(0, 10),
        priority: draft.urgent ? 'urgent' : 'normal',
        createdBy: me.email,
        note: draft.note ? `${draft.note} (prepared with Ask Vaultex)` : 'Prepared with Ask Vaultex',
        source: 'staff',
        lines: [{
          id: `ln-${Date.now().toString(36)}`, accountNo: draft.account.code, accountName: draft.account.name,
          amount: draft.amount, currency: draft.account.currency, counterAccountCode: draft.counter.code,
        }],
      });
      markCreated(messageId, index, req.requestNo);
    } catch (e) { showError(e); }
    setBusy(false);
  };

  return (
    <div className={cn('mt-3 overflow-hidden rounded-2xl border bg-card', createdNo ? 'border-success/40' : 'border-primary/30')}>
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/40 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold">
          {incoming ? <ArrowDownLeft className="h-3.5 w-3.5 text-success" /> : <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />}
          {tr(label.en, label.ar)}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {createdNo ? tr(`Request #${createdNo}`, `الطلب رقم ${createdNo}`) : tr('Draft', 'مسودة')}
        </span>
      </div>
      <div className="space-y-3 px-4 py-3.5">
        <p className="font-mono text-2xl font-bold tabular-nums" dir="ltr">{fmtMoney(draft.amount, draft.account.currency)}</p>
        {converted && (
          <p className="-mt-2 text-[11.5px] text-muted-foreground">
            {tr(`You asked for ${fmtMoney(draft.askedAmount, draft.askedCurrency)}, changed at today's rate.`, `طلبت ${fmtMoney(draft.askedAmount, draft.askedCurrency)}، وتم التحويل بسعر اليوم.`)}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12.5px]">
          <div><dt className="text-muted-foreground">{tr('For', 'لصالح')}</dt><dd className="font-medium">{nameOf(draft.account)}</dd></div>
          <div><dt className="text-muted-foreground">{draft.type === 'transfer_from' ? tr('To', 'إلى') : tr('Using', 'عبر')}</dt><dd className="font-medium">{nameOf(draft.counter)}</dd></div>
          <div><dt className="text-muted-foreground">{tr('Balance now', 'الرصيد الآن')}</dt><dd className="font-mono tabular-nums" dir="ltr">{fmtMoney(draft.balanceBefore, draft.account.currency)}</dd></div>
          <div><dt className="text-muted-foreground">{tr('Balance after', 'الرصيد بعد')}</dt><dd className={cn('font-mono font-semibold tabular-nums', draft.balanceAfter < 0 && 'text-destructive')} dir="ltr">{fmtMoney(draft.balanceAfter, draft.account.currency)}</dd></div>
        </dl>
        {draft.note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">{draft.note}</p>}
        {createdNo ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-[12.5px] text-success">
            <span className="flex items-center gap-1.5 font-medium"><CheckCircle2 className="h-4 w-4" />{tr('Made. Another person must say OK.', 'تم الإنشاء. يجب أن يوافق شخص آخر.')}</span>
            <button className="font-semibold underline underline-offset-2" onClick={() => { setOpen(false); navigate('/operations?tab=pending'); }}>
              {tr('Open', 'افتح')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={create} disabled={busy} className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />{tr('Create request', 'أنشئ الطلب')}
            </Button>
            <span className="text-[11.5px] text-muted-foreground">{tr('Nothing moves until a second person says OK.', 'لا يتحرك شيء حتى يوافق شخص ثانٍ.')}</span>
          </div>
        )}
        {!createdNo && draft.balanceAfter < 0 && (
          <p className="flex items-center gap-1.5 text-[12px] text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{tr('After this the balance goes below zero.', 'بعد هذا يصبح الرصيد تحت الصفر.')}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page button ─────────────────────────────────────────────────────────────

export function PageButton({ to, label }: { to: string; label?: string }) {
  const { tr } = useTranslation();
  const navigate = useNavigate();
  const setOpen = useAskVaultex((s) => s.setOpen);
  return (
    <button
      onClick={() => { navigate(to); if (window.innerWidth < 768) setOpen(false); }}
      className="mt-3 me-2 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      {label || tr('Open the page', 'افتح الصفحة')}
      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
    </button>
  );
}
