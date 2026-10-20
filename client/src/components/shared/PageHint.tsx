import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface PageHintProps {
  id: string;         // unique key stored in localStorage so "dismiss" persists
  icon?: string;      // emoji
  title: string;      // e.g. "What is this page?"
  children: React.ReactNode;
  className?: string;
}

export function PageHint({ id, icon = '💡', title, children, className }: PageHintProps) {
  const { tr } = useTranslation();
  const storageKey = `vaultex-hint-dismissed-${id}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className={cn(
      'flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3.5 text-sm',
      className,
    )}>
      <span className="shrink-0 text-lg leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-[13px]">{title}</p>
        <div className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{children}</div>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          try { localStorage.setItem(storageKey, '1'); } catch {}
        }}
        className="shrink-0 mt-0.5 rounded-lg p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
        title={tr('Hide this tip', 'إخفاء هذه النصيحة')}
        aria-label={tr('Hide this tip', 'إخفاء هذه النصيحة')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
