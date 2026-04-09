import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  changed_by: string;
  changed_at: string;
  old_data: any;
  new_data: any;
}

const ACTION_STYLE: Record<string, string> = {
  INSERT: 'bg-emerald-500/10 text-emerald-700',
  UPDATE: 'bg-blue-500/10 text-blue-700',
  DELETE: 'bg-destructive/10 text-destructive',
};

export default function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    const { data } = await supabase
      .from('ai_audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(200);
    setEntries((data as AuditEntry[]) || []);
    setLoading(false);
  }

  const tables = [...new Set(entries.map(e => e.table_name))];
  const filtered = entries.filter(e => {
    if (filterTable !== 'all' && e.table_name !== filterTable) return false;
    if (search && !e.action.toLowerCase().includes(search.toLowerCase()) && !e.table_name.toLowerCase().includes(search.toLowerCase()) && !e.record_id.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[200px]"><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Tabellen</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
            <Badge variant="outline" className="ml-2 text-xs">{filtered.length} Einträge</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Lade Audit-Daten…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Keine Audit-Einträge gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Tabelle</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Benutzer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{format(new Date(e.changed_at), 'dd.MM.yy HH:mm', { locale: de })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${ACTION_STYLE[e.action] || ''}`}>{e.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{e.table_name}</TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[120px]">{e.record_id}</TableCell>
                    <TableCell className="text-xs">{e.changed_by?.substring(0, 8) || 'System'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
