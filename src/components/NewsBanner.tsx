import { useEffect, useState } from 'react';
import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  message: string;
  variant: string;
}

const variantStyles: Record<string, { bg: string; icon: typeof Info }> = {
  info: { bg: 'bg-blue-50 border-blue-200 text-blue-900', icon: Info },
  warning: { bg: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle },
  success: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle2 },
};

export default function NewsBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('dismissed_news_banners') || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    (supabase as any).from('news_banners')
      .select('id, message, variant')
      .eq('active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }: any) => setBanners(data ?? []));
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem('dismissed_news_banners', JSON.stringify([...next]));
  };

  const visible = banners.filter(b => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(b => {
        const v = variantStyles[b.variant] ?? variantStyles.info;
        const Icon = v.icon;
        return (
          <div key={b.id} className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${v.bg}`}>
            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="flex-1 text-sm font-medium whitespace-pre-wrap">{b.message}</p>
            <button onClick={() => dismiss(b.id)} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Banner schliessen">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
