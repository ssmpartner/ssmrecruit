import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Braces } from 'lucide-react';
import {
  PLACEHOLDER_GROUPS, type ContractArea, type TargetGroupCode, type PlaceholderMeta,
} from '@/lib/contract-placeholders';

interface Props {
  area: ContractArea;
  targetGroup?: TargetGroupCode;
  onInsert: (token: string) => void;
}

export default function PlaceholderPicker({ area, targetGroup, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACEHOLDER_GROUPS.map(group => {
      const placeholders = group.placeholders.filter(p => {
        if (q && !p.key.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) return false;
        return true;
      });
      return { ...group, placeholders };
    }).filter(g => g.placeholders.length > 0);
  }, [query]);

  function isAllowed(p: PlaceholderMeta) {
    if (p.areaScope && !p.areaScope.includes(area)) return false;
    if (p.targetGroups && targetGroup && !p.targetGroups.includes(targetGroup)) return false;
    return true;
  }

  function pick(p: PlaceholderMeta) {
    if (!isAllowed(p)) return;
    onInsert(`{{${p.key}}}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Braces className="h-3.5 w-3.5" />Platzhalter einfügen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b">
          <Input
            placeholder="Platzhalter suchen…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-80">
          <div className="p-3 space-y-4">
            {filtered.map(group => (
              <div key={group.id}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {group.label}
                </div>
                {group.description && (
                  <p className="text-[11px] text-muted-foreground mb-2">{group.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {group.placeholders.map(p => {
                    const allowed = isAllowed(p);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        disabled={!allowed}
                        onClick={() => pick(p)}
                        className={`text-left px-2 py-1 rounded border text-xs hover:bg-accent transition ${
                          allowed ? '' : 'opacity-40 cursor-not-allowed line-through'
                        }`}
                        title={`{{${p.key}}}`}
                      >
                        <code className="font-mono">{`{{${p.key}}}`}</code>
                        <span className="ml-1 text-muted-foreground">— {p.label}</span>
                        {p.required && <Badge variant="outline" className="ml-1 h-4 text-[10px] px-1">Pflicht</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Keine Treffer.</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
