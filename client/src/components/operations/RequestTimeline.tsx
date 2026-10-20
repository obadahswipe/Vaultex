import { CheckCircle, Clock, FileText, PlayCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/lib/data/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useBooks } from '@/stores/books.store';

const stepConfig: Record<TimelineEvent['action'], { icon: typeof CheckCircle; color: string; en: string; ar: string }> = {
  created:   { icon: Clock,       color: 'text-muted-foreground bg-muted',                          en: 'Request made',          ar: 'أُنشئ الطلب' },
  confirmed: { icon: CheckCircle, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40',           en: 'Said OK',               ar: 'تمت الموافقة' },
  executed:  { icon: PlayCircle,  color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/40',     en: 'Money sent on MT5',     ar: 'أُرسل المال على MT5' },
  voucher:   { icon: FileText,    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40',  en: 'Written in the books',  ar: 'سُجّل في الدفاتر' },
  rejected:  { icon: XCircle,     color: 'text-red-600 bg-red-100 dark:bg-red-950/40',              en: 'Said no',               ar: 'رُفض' },
};

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Who did each step, and when. */
export function RequestTimeline({ events }: { events: TimelineEvent[] }) {
  const { tr, lang } = useTranslation();
  const users = useBooks((s) => s.users);
  const who = (email: string) => users.find((u) => u.email === email)?.name ?? email;
  return (
    <div className="space-y-3">
      {events.map((ev, i) => {
        const cfg = stepConfig[ev.action];
        const Icon = cfg.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cfg.color)}>
                <Icon className="h-4 w-4" />
              </div>
              {i < events.length - 1 && <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: '16px' }} />}
            </div>
            <div className="flex-1 pb-3">
              <p className="text-sm font-semibold">{tr(cfg.en, cfg.ar)}</p>
              <p className="text-xs text-muted-foreground">{who(ev.by)} · {formatTime(ev.at, lang)}</p>
              {ev.note && <p className="mt-1 text-xs italic text-foreground/70">“{ev.note}”</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
