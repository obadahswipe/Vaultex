import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Users as UsersIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, TextArea, showError } from '@/components/shared/form';
import { AccountPicker } from '@/components/shared/AccountPicker';
import { LedgerPreview } from './LedgerPreview';
import { TYPE_STYLE } from './RequestTypeBadge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBooks } from '@/stores/books.store';
import { useActingUser, useLedger } from '@/lib/data/hooks';
import { buildRequestLines, lineEffect, PostingError } from '@/lib/data/ledger';
import { REQUEST_TYPE_LABEL } from '@/lib/data/labels';
import { crossRate, fmtMoney, round2 } from '@/lib/data/money';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Category, OperationRequest, RequestType } from '@/lib/data/types';

const CHOICES: RequestType[] = ['deposit', 'withdrawal', 'ib_withdrawal', 'ib_deposit', 'transfer_from', 'expense'];
const MONEY_PLACES: Category[] = ['funds', 'banks', 'suppliers'];

/** Which accounts can be picked as "who" for each kind of request. */
const WHO: Record<RequestType, Category[]> = {
  deposit: ['clients'],
  withdrawal: ['clients'],
  ib_deposit: ['ibs'],
  ib_withdrawal: ['ibs'],
  transfer_from: ['clients', 'funds', 'banks', 'suppliers'],
  transfer_to: ['clients', 'funds', 'banks', 'suppliers'],
  expense: ['expenses'],
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a client account (e.g. when opened from the client page). */
  presetAccount?: string;
  presetType?: RequestType;
}

export function NewRequestDialog({ open, onClose, presetAccount, presetType }: Props) {
  const { tr, nameOf, lang } = useTranslation();
  const addRequest = useBooks((s) => s.addRequest);
  const me = useActingUser();
  const { byCode, balances, rates, accounts } = useLedger();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<RequestType>('deposit');
  const [who, setWho] = useState('');
  const [where, setWhere] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(presetType || presetAccount ? 2 : 1);
    setType(presetType ?? 'deposit');
    setWho(presetAccount ?? '');
    setWhere(''); setAmount(''); setRate(''); setUrgent(false); setNote('');
    setDate(new Date().toISOString().slice(0, 10));
  }, [open, presetAccount, presetType]);

  const whoAcc = byCode.get(who);
  const whereAcc = byCode.get(where);
  const isMove = type === 'transfer_from';
  const needsRate = !!whoAcc && !!whereAcc && whoAcc.currency !== whereAcc.currency;
  const marketRate = whoAcc && whereAcc ? crossRate(whoAcc.currency, whereAcc.currency, rates) : 1;

  useEffect(() => {
    if (needsRate) setRate(String(round2(marketRate * 10000) / 10000));
    else setRate('');
  }, [needsRate, marketRate]);

  const amt = Number(amount);
  const rateNum = Number(rate);
  const received = needsRate && rateNum > 0 ? round2(amt * rateNum) : undefined;

  const draft = useMemo((): OperationRequest | null => (whoAcc && whereAcc && amt > 0 ? {
    id: 'draft', requestNo: 0, type, date, priority: urgent ? 'urgent' : 'normal', status: 'pending',
    lines: [{
      id: 'ln-draft', accountNo: whoAcc.code, accountName: whoAcc.name, amount: amt, currency: whoAcc.currency,
      counterAccountCode: whereAcc.code,
      exchangeRate: needsRate ? rateNum : undefined, receivedAmount: received,
    }],
    createdBy: me.email, timeline: [], note: note || undefined,
  } : null), [whoAcc, whereAcc, amt, type, date, urgent, needsRate, rateNum, received, me.email, note]);

  const preview = useMemo(() => {
    if (!draft) return { lines: [], error: '' };
    try { return { lines: buildRequestLines(draft, accounts, rates), error: '' }; }
    catch (e) { return { lines: [], error: e instanceof PostingError ? (lang === 'ar' ? e.ar : e.en) : String(e) }; }
  }, [draft, accounts, rates, lang]);

  const after = whoAcc && preview.lines.length
    ? (balances[whoAcc.code] ?? 0) + preview.lines.filter((l) => l.accountCode === whoAcc.code).reduce((s, l) => s + lineEffect(whoAcc, l), 0)
    : null;

  const sentence = () => {
    if (!whoAcc || !whereAcc || !(amt > 0)) return '';
    const m = fmtMoney(amt, whoAcc.currency);
    const w = nameOf(whoAcc); const p = nameOf(whereAcc);
    switch (type) {
      case 'deposit': return tr(`${w} adds ${m}. The money goes into ${p}.`, `${w} يضيف ${m}. ويدخل المال إلى ${p}.`);
      case 'withdrawal': return tr(`${w} takes out ${m}. The money leaves ${p}.`, `${w} يسحب ${m}. ويخرج المال من ${p}.`);
      case 'ib_deposit': return tr(`${w} adds ${m} into ${p}.`, `${w} يضيف ${m} إلى ${p}.`);
      case 'ib_withdrawal': return tr(`You pay ${w} ${m} from ${p}.`, `تدفع لـ ${w} مبلغ ${m} من ${p}.`);
      case 'expense': return tr(`You pay ${m} for "${w}" from ${p}.`, `تدفع ${m} مقابل "${w}" من ${p}.`);
      default: return tr(`Move ${m} from ${w} to ${p}.`, `انقل ${m} من ${w} إلى ${p}.`);
    }
  };

  const canNext = !!whoAcc && !!whereAcc && amt > 0 && (!needsRate || rateNum > 0) && !preview.error;

  const submit = () => {
    if (!draft) return;
    try {
      const lines = draft.lines.map((l) => ({ ...l, id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
      const req = addRequest({
        type, date, priority: urgent ? 'urgent' : 'normal', lines, createdBy: me.email, note: note || undefined, source: 'staff',
      });
      toast({
        title: tr(`Request #${req.requestNo} is made`, `تم إنشاء الطلب رقم ${req.requestNo}`),
        description: tr('Now a manager needs to say OK.', 'الآن يحتاج إلى موافقة المدير.'),
      });
      onClose();
    } catch (e) { showError(e); }
  };

  const whoLabel = type === 'expense' ? tr('What is the cost for?', 'ما نوع المصروف؟')
    : type === 'ib_deposit' || type === 'ib_withdrawal' ? tr('Which partner?', 'أي شريك؟')
    : isMove ? tr('Move money from', 'انقل المال من')
    : tr('Which client?', 'أي زبون؟');
  const whereLabel = isMove ? tr('Move money to', 'انقل المال إلى')
    : type === 'deposit' || type === 'ib_deposit' ? tr('Where does the money go in?', 'إلى أين يدخل المال؟')
    : tr('Where does the money come out of?', 'من أين يخرج المال؟');
  const whereCats: Category[] = isMove
    ? (whoAcc?.category === 'clients' ? ['clients'] : MONEY_PLACES)
    : MONEY_PLACES;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr('New money request', 'طلب مال جديد')}</DialogTitle>
          <DialogDescription>
            {step === 1 && tr('Step 1 of 3 · What is happening?', 'الخطوة 1 من 3 · ماذا يحدث؟')}
            {step === 2 && tr('Step 2 of 3 · Fill in the details', 'الخطوة 2 من 3 · املأ التفاصيل')}
            {step === 3 && tr('Step 3 of 3 · Check and send', 'الخطوة 3 من 3 · راجع وأرسل')}
          </DialogDescription>
        </DialogHeader>

        {/* progress */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => <div key={n} className={cn('h-1.5 flex-1 rounded-full', n <= step ? 'bg-primary' : 'bg-muted')} />)}
        </div>

        {step === 1 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {CHOICES.map((c) => {
              const l = REQUEST_TYPE_LABEL[c];
              const s = TYPE_STYLE[c];
              const Icon = s.icon;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setType(c); setWho(''); setWhere(''); setStep(2); }}
                  className={cn('flex items-start gap-3 rounded-2xl border p-4 text-start transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-shadow-2', type === c ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card')}
                >
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.cls)}><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-[15px] font-semibold">{tr(l.en, l.ar)}</span>
                    <span className="block text-[12px] text-muted-foreground">{tr(l.helpEn, l.helpAr)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label={whoLabel}>
              <AccountPicker value={who} onChange={(v) => { setWho(v); if (v === where) setWhere(''); }} categories={WHO[type]} />
            </Field>
            <Field label={whereLabel} help={isMove ? undefined : tr('A cash box, a bank, or a money partner.', 'صندوق نقدي أو بنك أو شريك مالي.')}>
              <AccountPicker value={where} onChange={setWhere} categories={whereCats} exclude={[who]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr(`How much${whoAcc ? ` (${whoAcc.currency})` : ''}?`, `كم المبلغ${whoAcc ? ` (${whoAcc.currency})` : ''}؟`)}>
                <Input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </Field>
              <Field label={tr('Date', 'التاريخ')}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {needsRate && whoAcc && whereAcc && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <Field
                  label={tr(`Exchange rate: 1 ${whoAcc.currency} = ? ${whereAcc.currency}`, `سعر الصرف: 1 ${whoAcc.currency} = ؟ ${whereAcc.currency}`)}
                  help={received != null ? tr(`${nameOf(whereAcc)} will change by ${fmtMoney(received, whereAcc.currency)}. Today's rate is ${marketRate.toFixed(4)}.`, `سيتغير ${nameOf(whereAcc)} بمقدار ${fmtMoney(received, whereAcc.currency)}. سعر اليوم ${marketRate.toFixed(4)}.`) : undefined}
                >
                  <Input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                </Field>
              </div>
            )}
            <Field label={tr('Note (optional)', 'ملاحظة (اختياري)')}>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('For example: bank transfer number 12345', 'مثال: رقم الحوالة البنكية 12345')} />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-4 w-4 rounded" />
              {tr('This is urgent', 'هذا مستعجل')}
            </label>
            {preview.error && (
              <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{preview.error}
              </p>
            )}
          </div>
        )}

        {step === 3 && draft && (
          <div className="space-y-4">
            <p className="rounded-2xl bg-primary/5 p-4 text-[15px] font-medium leading-relaxed">{sentence()}</p>
            {after != null && whoAcc && whoAcc.category === 'clients' && (
              <p className="text-[13px] text-muted-foreground">
                {tr(`After this, ${nameOf(whoAcc)} will have ${fmtMoney(after, whoAcc.currency)}.`, `بعد ذلك سيكون لدى ${nameOf(whoAcc)} ${fmtMoney(after, whoAcc.currency)}.`)}
                {after < 0 && <span className="ms-1 font-semibold text-destructive">{tr('That is less than zero!', 'وهذا أقل من صفر!')}</span>}
              </p>
            )}
            <div>
              <p className="mb-2 text-[13px] font-semibold">{tr('What will change in the books', 'ما الذي سيتغير في الدفاتر')}</p>
              <LedgerPreview lines={preview.lines} />
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[13px] text-muted-foreground">
              <UsersIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {tr('Next, a different person must say OK. Then the money is sent, and then it is written in the books.', 'بعد ذلك يجب أن يوافق شخص آخر. ثم يُرسل المال، ثم يُسجّل في الدفاتر.')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2)} className="gap-1">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {tr('Back', 'رجوع')}
            </Button>
          ) : <span />}
          {step === 2 && (
            <Button variant="gradient" disabled={!canNext} onClick={() => setStep(3)} className="gap-1">
              {tr('Next', 'التالي')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          )}
          {step === 3 && (
            <Button variant="gradient" onClick={submit}>{tr('Make the request', 'أنشئ الطلب')}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
