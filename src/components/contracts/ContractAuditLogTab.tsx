import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

type LogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field: string | null;
  old_value: any;
  new_value: any;
  changed_by_name: string | null;
  created_at: string;
};

const ENTITY_LABEL: Record<string, string> = {
  template: 'Vorlage',
  set: 'Vertragsset',
  template_attachment: 'Vorlagen-Anhang',
  letterhead: 'Briefpapier',
  permission: 'Berechtigung',
  library_document: 'Bibliotheks-Dokument',
  contract: 'Vertrag',
};
const ACTION_LABEL: Record<string, string> = {
  create: 'Erstellt', update: 'Geändert', delete: 'Gelöscht',
  version: 'Versioniert', finalize: 'Finalisiert', send: 'Versendet', archive: 'Archiviert',
};

export default function ContractAuditLogTab() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    let q = supabase.from('contract_audit_log').select('*').order('created_at', { ascending: false }).limit(500);
    if (entityFilter !== 'all') q = q.eq('entity_type', entityFilter);
    const { data } = await q;
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entityFilter]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.changed_by_name ?? '').toLowerCase().includes(s)
      || r.entity_id.toLowerCase().includes(s)
      || (r.field ?? '').toLowerCase().includes(s);
  });

  const toggle = (id: string) => setExpanded(e => {
    const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Objekte</SelectItem>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Suche (Nutzer, ID, Feld)…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" />Aktualisieren</Button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} Einträge</span>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Zeitpunkt</TableHead>
              <TableHead>Objekt</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Feld</TableHead>
              <TableHead>Nutzer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Lädt…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Einträge.</TableCell></TableRow>}
            {filtered.map(r => {
              const open = expanded.has(r.id);
              return (
                <>
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => toggle(r.id)}>
                    <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('de-CH')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ENTITY_LABEL[r.entity_type] ?? r.entity_type}</Badge>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">{r.entity_id.slice(0, 8)}…</div>
                    </TableCell>
                    <TableCell><Badge>{ACTION_LABEL[r.action] ?? r.action}</Badge></TableCell>
                    <TableCell className="text-xs">{r.field ?? '–'}</TableCell>
                    <TableCell className="text-sm">{r.changed_by_name ?? '–'}</TableCell>
                  </TableRow>
                  {open && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="grid md:grid-cols-2 gap-3 p-2">
                          <div>
                            <div className="text-xs font-semibold mb-1">Alter Wert</div>
                            <pre className="text-[10px] bg-background p-2 rounded border overflow-auto max-h-64">{JSON.stringify(r.old_value, null, 2) ?? '–'}</pre>
                          </div>
                          <div>
                            <div className="text-xs font-semibold mb-1">Neuer Wert</div>
                            <pre className="text-[10px] bg-background p-2 rounded border overflow-auto max-h-64">{JSON.stringify(r.new_value, null, 2) ?? '–'}</pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
