import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type MultiOption = {
  value: string;
  label: string;
  /** Tailwind-Klassen für ein farbiges Badge (z.B. Status) */
  badgeClass?: string;
  /** Hex-Farbe für einen farbigen Punkt (z.B. Agentur/Quelle) */
  dotColor?: string;
};

interface Props {
  /** Text, wenn nichts ausgewählt ist, z.B. «Alle Kantone» */
  allLabel: string;
  options: MultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Suchfeld einblenden (für lange Listen) */
  searchable?: boolean;
  className?: string;
  /** Hervorhebung, z.B. rot bei Rückfragen */
  highlight?: boolean;
}

export default function MultiSelectFilter({ allLabel, options, value, onChange, searchable, className, highlight }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const single = value.length === 1 ? options.find(o => o.value === value[0]) : undefined;

  const label = value.length === 0
    ? allLabel
    : value.length === 1
      ? (options.find(o => o.value === value[0])?.label ?? `1 ausgewählt`)
      : `${value.length} ausgewählt`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-ring',
            value.length === 0 && 'text-muted-foreground',
            highlight && value.length > 0 && 'border-red-300 text-red-700',
            className,
          )}
        >
          {single?.dotColor && (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: single.dotColor }} />
          )}
          {single?.badgeClass ? (
            <span className={cn('truncate rounded-md px-1.5 py-0.5 text-xs font-medium', single.badgeClass)}>{label}</span>
          ) : (
            <span className="truncate">{label}</span>
          )}
          {value.length > 1 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{value.length}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {searchable && (
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="h-6 w-full bg-transparent text-sm outline-none"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {visible.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">Keine Treffer</p>
          )}
          {visible.map(o => {
            const active = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded border', active ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                  {active && <Check className="h-3 w-3" />}
                </span>
                {o.dotColor && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.dotColor }} />
                )}
                {o.badgeClass ? (
                  <span className={cn('truncate rounded-md px-1.5 py-0.5 text-xs font-medium', o.badgeClass)}>{o.label}</span>
                ) : (
                  <span className="truncate">{o.label}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Auswahl leeren
          </button>
          <button
            type="button"
            onClick={() => onChange(visible.map(o => o.value))}
            className="text-xs font-medium text-primary hover:underline"
          >
            Alle wählen
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
