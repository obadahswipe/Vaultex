import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

interface InstallPWAButtonProps {
  className?: string;
  compact?: boolean;
}

export function InstallPWAButton({ className, compact }: InstallPWAButtonProps) {
  const { tr } = useTranslation();
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !evt) return null;

  const handleInstall = async () => {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === 'accepted') setEvt(null);
  };

  if (compact) {
    return (
      <Button
        size="icon"
        variant="soft"
        onClick={handleInstall}
        className={cn('relative', className)}
        title={tr('Put Vaultex on your phone or computer', 'ضع فولتكس على هاتفك أو حاسوبك')}
      >
        <Download className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
      </Button>
    );
  }

  return (
    <Button variant="soft" size="sm" onClick={handleInstall} className={cn('gap-1.5', className)}>
      <Download className="h-3.5 w-3.5" />
      {tr('Install the app', 'ثبّت التطبيق')}
    </Button>
  );
}
