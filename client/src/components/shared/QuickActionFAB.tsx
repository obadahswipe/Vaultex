import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Inbox, Users, Network, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

/** The round "+" button: shortcuts to the things people add most. */
export function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tr } = useTranslation();

  const actions = [
    { icon: Inbox,   label: tr('New money request', 'طلب مال جديد'), color: 'bg-primary text-primary-foreground', to: '/operations?new=1' },
    { icon: Users,   label: tr('Add a client', 'أضف زبونًا'),        color: 'bg-emerald-500 text-white',          to: '/clients?new=1' },
    { icon: Network, label: tr('Add a partner', 'أضف شريكًا'),       color: 'bg-violet-500 text-white',           to: '/ib-mgmt?new=1' },
    { icon: PenLine, label: tr('Write an entry', 'سجّل قيدًا'),       color: 'bg-amber-500 text-white',            to: '/entries?new=1' },
  ];

  return (
    <div className="fixed bottom-20 end-4 z-40 flex flex-col-reverse items-end gap-3 md:bottom-6 md:end-6">
      {open && actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <button
            key={action.to}
            onClick={() => { setOpen(false); navigate(action.to); }}
            className="flex items-center gap-2 animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium shadow-md whitespace-nowrap">
              {action.label}
            </span>
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110', action.color)}>
              <Icon className="h-4 w-4" />
            </span>
          </button>
        );
      })}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200',
          'gradient-bg text-white hover:scale-110 hover:shadow-glow',
          open && 'rotate-45',
        )}
        aria-label={tr('Add something', 'أضف شيئًا')}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
