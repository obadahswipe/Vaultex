// The Ask Vaultex box on the home page: type a question, or tap one that fits today.
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useActingUser } from '@/lib/data/hooks';
import { useBooks } from '@/stores/books.store';
import { useAskVaultex } from '@/lib/ai/chat.store';
import { snapshotNow } from '@/lib/ai/runTool';
import { suggestionsFor } from '@/lib/ai/briefing';

export function AskHomeCard() {
  const { tr, lang } = useTranslation();
  const me = useActingUser();
  const location = useLocation();
  const requests = useBooks((s) => s.requests);
  const entries = useBooks((s) => s.entries);
  const { ask, setOpen, busy } = useAskVaultex();
  const [q, setQ] = useState('');
  const chips = useMemo(
    () => suggestionsFor(snapshotNow(), tr, 'Home').slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tr, requests, entries],
  );

  const go = (text: string) => {
    if (!text.trim() || busy) return;
    setOpen(true);
    setQ('');
    void ask(text, { page: location.pathname, pageName: 'Home', userName: me.name, userRole: me.role, lang });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl p-[1.5px] bg-[linear-gradient(120deg,hsl(222_91%_60%),hsl(262_83%_64%),hsl(190_85%_52%))]">
      <div className="relative rounded-[calc(1.5rem-1.5px)] bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div aria-hidden className="pointer-events-none absolute -end-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,hsl(262_83%_64%/0.18),transparent_70%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="lg:w-[34%]">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-xl gradient-bg text-white"><Sparkles className="h-4 w-4" /></span>
              {tr('Ask Vaultex', 'اسأل فولتكس')}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {tr('Ask anything about your money. It reads the books, draws charts and can prepare requests for you to check.', 'اسأل عن أي شيء يخص مالك. يقرأ الدفاتر ويرسم الرسوم ويجهّز الطلبات لتراجعها.')}
            </p>
          </div>
          <div className="flex-1 space-y-3">
            <form
              onSubmit={(e) => { e.preventDefault(); go(q); }}
              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-2 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tr('For example: who owes us the most?', 'مثلًا: من يدين لنا بأكبر مبلغ؟')}
                className="h-10 flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-muted-foreground/70"
              />
              <button type="submit" disabled={!q.trim() || busy} className="grid h-9 w-9 place-items-center rounded-xl gradient-bg text-white disabled:opacity-40" aria-label={tr('Ask', 'اسأل')}>
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.text}
                  onClick={() => go(c.text)}
                  className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[12.5px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
