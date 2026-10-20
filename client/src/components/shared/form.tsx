import { type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { PostingError } from '@/lib/data/ledger';
import { useI18nStore } from '@/stores/i18n.store';

/** A label, the input, and an optional one-line help text under it. */
export function Field({ label, help, children, className }: { label: string; help?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {help && <span className="block text-[12px] text-muted-foreground">{help}</span>}
    </label>
  );
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        className,
      )}
    />
  );
}

/** Show a friendly error in the person's language. */
export function showError(err: unknown) {
  const lang = useI18nStore.getState().lang;
  if (err instanceof PostingError) {
    toast({ title: lang === 'ar' ? 'لم يتم ذلك' : 'That did not work', description: lang === 'ar' ? err.ar : err.en, variant: 'destructive' });
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  toast({ title: lang === 'ar' ? 'حدث خطأ' : 'Something went wrong', description: msg, variant: 'destructive' });
}

/** Run an action; if it throws, show the error and return false. */
export function attempt(fn: () => void, success?: string) {
  try {
    fn();
    if (success) toast({ title: success });
    return true;
  } catch (e) {
    showError(e);
    return false;
  }
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors', checked ? 'bg-success' : 'bg-muted')}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0')} />
    </button>
  );
}

/** A row of pill buttons to pick one filter. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/60',
          )}
        >
          {o.label}
          {o.count != null && <span className={cn('ms-1.5 rounded-full px-1.5 text-[11px]', value === o.value ? 'bg-white/20' : 'bg-muted')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
