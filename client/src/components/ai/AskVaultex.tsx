// Ask Vaultex: a money helper that reads the books and answers in plain words.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles, X, RotateCcw, ArrowUp, Square, Mic, MicOff, Copy, Check, Loader2, CheckCircle2,
  Sun, Inbox, Scale, TrendingUp, Users, ShieldAlert, PenLine, BookOpen, Network, CalendarCheck, AlertCircle, WifiOff,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useActingUser } from '@/lib/data/hooks';
import { findNavItem } from '@/components/layout/nav';
import { useBooks } from '@/stores/books.store';
import { useAskVaultex, type AskContext, type UiMessage } from '@/lib/ai/chat.store';
import { snapshotNow } from '@/lib/ai/runTool';
import { localBriefing, suggestionsFor, type Suggestion } from '@/lib/ai/briefing';
import { AskChart, DraftCard, Markdown, PageButton } from './AskParts';
import { cn } from '@/lib/utils';

const TOOL_LABEL: Record<string, { en: string; ar: string }> = {
  get_snapshot: { en: 'Company overview', ar: 'نظرة على الشركة' },
  find_clients: { en: 'Clients', ar: 'الزبائن' },
  get_client: { en: 'Client file', ar: 'ملف الزبون' },
  list_requests: { en: 'Money requests', ar: 'طلبات المال' },
  get_partners: { en: 'Partners', ar: 'الشركاء' },
  get_trades: { en: 'Trades', ar: 'الصفقات' },
  get_money_places: { en: 'Banks and cash', ar: 'البنوك والصناديق' },
  get_profit: { en: 'Profit', ar: 'الأرباح' },
  get_accounts: { en: 'Accounts', ar: 'الحسابات' },
  get_entries: { en: 'Entries', ar: 'القيود' },
  get_rates: { en: 'Exchange rates', ar: 'أسعار الصرف' },
  get_team: { en: 'Team', ar: 'الفريق' },
  get_activity: { en: 'Who did what', ar: 'من فعل ماذا' },
  show_chart: { en: 'Chart', ar: 'رسم بياني' },
  draft_money_request: { en: 'Draft request', ar: 'مسودة طلب' },
  open_page: { en: 'Page link', ar: 'رابط صفحة' },
};

const SUGGESTION_ICON: Record<Suggestion['icon'], typeof Sun> = {
  brief: Sun, approve: Inbox, match: Scale, profit: TrendingUp, clients: Users, risk: ShieldAlert,
  draft: PenLine, page: BookOpen, partners: Network, close: CalendarCheck,
};

// ─── Voice ───────────────────────────────────────────────────────────────────

type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void; onerror: () => void; start: () => void; stop: () => void;
};

function useVoice(lang: 'en' | 'ar', onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const Ctor = typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined
    : undefined;
  const toggle = () => {
    if (!Ctor) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };
  return { supported: !!Ctor, listening, toggle };
}

// ─── Launcher ────────────────────────────────────────────────────────────────

export function AskVaultexButton({ compact = false }: { compact?: boolean }) {
  const { tr } = useTranslation();
  const toggle = useAskVaultex((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-xl text-[13px] font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110',
        'bg-[linear-gradient(120deg,hsl(222_91%_55%),hsl(262_83%_60%),hsl(222_91%_55%))] bg-[length:200%_100%] [animation:ask-sheen_6s_linear_infinite]',
        compact ? 'w-9' : 'px-3',
      )}
      aria-label={tr('Ask Vaultex', 'اسأل فولتكس')}
    >
      <Sparkles className="h-4 w-4" />
      {!compact && <span>{tr('Ask Vaultex', 'اسأل فولتكس')}</span>}
      {!compact && <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium lg:inline">⌘J</kbd>}
    </button>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function useAskContext(): AskContext {
  const { lang } = useTranslation();
  const me = useActingUser();
  const location = useLocation();
  const nav = findNavItem(location.pathname);
  return { page: location.pathname, pageName: nav?.en ?? 'Home', userName: me.name, userRole: me.role, lang };
}

function Orb({ size = 'md', live = false }: { size?: 'md' | 'lg'; live?: boolean }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center rounded-2xl text-white', size === 'lg' ? 'h-14 w-14' : 'h-9 w-9')}>
      <span className={cn('absolute inset-0 rounded-[inherit] bg-[conic-gradient(from_180deg,hsl(222_91%_58%),hsl(262_83%_62%),hsl(190_85%_50%),hsl(222_91%_58%))]', live && 'animate-[spin_3s_linear_infinite]')} />
      <span className="absolute inset-[2px] rounded-[inherit] bg-[radial-gradient(circle_at_30%_25%,hsl(222_91%_70%),hsl(232_80%_45%))]" />
      <Sparkles className={cn('relative', size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />
    </span>
  );
}

function ErrorNote({ code, onRetry }: { code: NonNullable<UiMessage['error']>; onRetry: () => void }) {
  const { tr } = useTranslation();
  if (code === 'not_configured') {
    return (
      <div className="mt-2 space-y-3">
        <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12.5px]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{tr('The AI is not switched on for this site yet, so I can only give you the quick numbers below. An admin adds the AI key once and then you can ask anything.', 'لم يتم تشغيل الذكاء الاصطناعي لهذا الموقع بعد، لذلك أستطيع فقط أن أعطيك الأرقام السريعة أدناه. يضيف المسؤول مفتاح الذكاء الاصطناعي مرة واحدة، ثم يمكنك أن تسأل عن أي شيء.')}</span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-[13.5px]">
          <Markdown text={localBriefing(snapshotNow(), tr)} />
        </div>
      </div>
    );
  }
  const text = {
    busy: tr('Many questions at once. Wait a few seconds and try again.', 'أسئلة كثيرة في وقت واحد. انتظر بضع ثوانٍ وحاول مرة أخرى.'),
    offline: tr('You seem to be offline. Check the internet and try again.', 'يبدو أنك غير متصل. تحقق من الإنترنت وحاول مرة أخرى.'),
    refused: tr('I cannot help with that one. Try asking about your books in another way.', 'لا أستطيع المساعدة في هذا. جرّب أن تسأل عن دفاترك بطريقة أخرى.'),
    too_long: tr('This chat got too long. Start a new chat and ask again.', 'أصبحت هذه المحادثة طويلة جدًا. ابدأ محادثة جديدة واسأل مرة أخرى.'),
    failed: tr('Something went wrong on my side. Try again.', 'حدث خطأ من جهتي. حاول مرة أخرى.'),
  }[code];
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[12.5px]">
      <span className="flex items-center gap-2">{code === 'offline' ? <WifiOff className="h-4 w-4 text-destructive" /> : <AlertCircle className="h-4 w-4 text-destructive" />}{text}</span>
      {code !== 'refused' && code !== 'too_long' && <button className="font-semibold text-primary" onClick={onRetry}>{tr('Try again', 'حاول مجددًا')}</button>}
    </div>
  );
}

function AssistantMessage({ m, onRetry }: { m: UiMessage; onRetry: () => void }) {
  const { tr, lang } = useTranslation();
  const [copied, setCopied] = useState(false);
  const label = (n: string) => (TOOL_LABEL[n] ? (lang === 'ar' ? TOOL_LABEL[n].ar : TOOL_LABEL[n].en) : n);
  const readTools = m.tools.filter((t) => t !== 'show_chart' && t !== 'draft_money_request' && t !== 'open_page');
  const thinking = m.streaming && !m.text;
  return (
    <div className="flex gap-3">
      <Orb live={m.streaming} />
      <div className="min-w-0 flex-1 pt-1">
        {thinking && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="ask-shimmer">
              {readTools.length ? tr(`Reading ${label(readTools.at(-1)!)}…`, `أقرأ ${label(readTools.at(-1)!)}…`) : tr('Thinking…', 'أفكر…')}
            </span>
          </div>
        )}
        {m.text && (
          <div className="text-[14px] text-foreground/90">
            <Markdown text={m.text} />
            {m.streaming && <span className="ms-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded bg-primary/70" />}
          </div>
        )}
        {m.attachments.map((a, i) => (
          a.kind === 'chart' ? <AskChart key={i} chart={a.chart} />
            : a.kind === 'draft' ? <DraftCard key={i} draft={a.draft} createdNo={a.createdNo} messageId={m.id} index={i} />
            : <PageButton key={i} to={a.to} label={a.label} />
        ))}
        {m.error && <ErrorNote code={m.error} onRetry={onRetry} />}
        {!m.streaming && (readTools.length > 0 || m.text) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {readTools.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-success" />
                {tr('Checked:', 'تم الفحص:')}
                {readTools.map((t) => <span key={t} className="rounded-md bg-muted px-1.5 py-0.5">{label(t)}</span>)}
              </span>
            )}
            {m.text && (
              <button
                onClick={() => { navigator.clipboard?.writeText(m.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
                className="ms-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? tr('Copied', 'تم النسخ') : tr('Copy', 'نسخ')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AskVaultexPanel() {
  const { tr, lang, dir, nameOf } = useTranslation();
  const ctx = useAskContext();
  const me = useActingUser();
  const employee = useBooks((s) => s.employees.find((e) => e.name === me.name));
  const { open, setOpen, toggle, messages, busy, ask, stop, reset } = useAskVaultex();
  const clients = useBooks((s) => s.clients);
  const requests = useBooks((s) => s.requests);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice(lang, (t) => setDraft(t));

  const suggestions = useMemo(
    () => (open ? suggestionsFor(snapshotNow(), tr, ctx.pageName, clients.find((c) => c.active && c.kycStatus === 'approved')?.name) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, tr, ctx.pageName, clients, requests],
  );

  // ⌘J / Ctrl+J opens and closes, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); toggle(); }
      else if (e.key === 'Escape' && useAskVaultex.getState().open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, setOpen]);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 120); }, [open]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const send = (text = draft) => {
    if (!text.trim() || busy) return;
    setDraft('');
    void ask(text, ctx);
  };
  const lastQuestion = [...messages].reverse().find((m) => m.role === 'user')?.text;
  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };
  const firstName = (employee ? nameOf(employee) : me.name).split(' ')[0];

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm transition-opacity md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        dir={dir}
        aria-label={tr('Ask Vaultex', 'اسأل فولتكس')}
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 end-0 z-[61] flex w-full flex-col border-s border-border/60 bg-background shadow-2xl transition-transform duration-300 ease-out md:w-[460px]',
          open ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full',
        )}
      >
        <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Orb live={busy} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold leading-tight">{tr('Ask Vaultex', 'اسأل فولتكس')}</h2>
            <p className="truncate text-[11.5px] text-muted-foreground">{tr('Reads your books. Never moves money on its own.', 'يقرأ دفاترك. ولا يحرّك المال وحده أبدًا.')}</p>
          </div>
          {messages.length > 0 && (
            <button onClick={reset} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title={tr('New chat', 'محادثة جديدة')} aria-label={tr('New chat', 'محادثة جديدة')}>
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={tr('Close', 'إغلاق')}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-5">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col">
              <div className="mb-6 mt-2 flex flex-col items-center text-center">
                <Orb size="lg" />
                <h3 className="mt-4 text-xl font-bold">{tr(`Hi ${firstName}. What do you want to know?`, `مرحبًا ${firstName}. ماذا تريد أن تعرف؟`)}</h3>
                <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
                  {tr('Ask about money, clients, partners or trades. I check the books and answer in simple words.', 'اسأل عن المال أو الزبائن أو الشركاء أو الصفقات. أفحص الدفاتر وأجيب بكلمات بسيطة.')}
                </p>
              </div>
              <div className="grid gap-2">
                {suggestions.map((s) => {
                  const Icon = SUGGESTION_ICON[s.icon];
                  return (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 text-start text-[13px] transition-all hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                      <span className="flex-1">{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-primary px-3.5 py-2.5 text-[14px] text-primary-foreground">{m.text}</p>
                </div>
              ) : (
                <AssistantMessage key={m.id} m={m} onRetry={() => lastQuestion && send(lastQuestion)} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/50 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card px-2 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={voice.listening ? tr('Listening…', 'أستمع…') : tr('Ask about your money…', 'اسأل عن مالك…')}
              className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-muted-foreground/70"
            />
            {voice.supported && (
              <button
                onClick={voice.toggle}
                className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors', voice.listening ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-muted')}
                aria-label={voice.listening ? tr('Stop listening', 'أوقف الاستماع') : tr('Speak', 'تحدث')}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {busy ? (
              <button onClick={stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-background" aria-label={tr('Stop', 'توقف')}>
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!draft.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-bg text-white transition-opacity disabled:opacity-40"
                aria-label={tr('Send', 'إرسال')}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 px-1 text-center text-[10.5px] text-muted-foreground">
            {tr('Answers come from this company’s books. Check before you act.', 'الإجابات من دفاتر هذه الشركة. تحقق قبل أن تتصرف.')}
          </p>
        </div>
      </aside>
    </>
  );
}
