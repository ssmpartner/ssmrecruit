import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileSignature, FileText, Files, History, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_STATUS_LABELS } from '@/lib/contract-placeholders';

type ContractRow = {
  id: string;
  contract_number: string | null;
  candidate_lead_id: string | null;
  employee_id: string | null;
  kind_code: string | null;
  status: string;
  current_version: number;
  created_at: string;
  created_by: string | null;
  docx_path: string | null;
  pdf_path: string | null;
  merged_pdf_path: string | null;
  person_name?: string;
  kind_label?: string;
  creator_name?: string;
};

type VersionRow = {
  id: string;
  version: number;
  created_at: string;
  snapshot: any;
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  finalized: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  sent: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
  signed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300',
  archived: 'bg-zinc-200 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400',
};

interface Props {
  onNewContract: () => void;
}

export default function ContractsOverviewTab({ onNewContract }: Props) {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kinds, setKinds] = useState<any[]>([]);
  const [detail, setDetail] = useState<ContractRow | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: contracts }, { data: kindRows }, { data: profiles }] = await Promise.all([
      supabase.from('contracts')
        .select('*, leads:candidate_lead_id(name), employees:employee_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('contract_kinds').select('code, label_de'),
      supabase.from('profiles').select('id, display_name'),
    ]);
    const kindMap = new Map((kindRows ?? []).map((k: any) => [k.code, k.label_de]));
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    setKinds(kindRows ?? []);
    setRows((contracts ?? []).map((r: any) => ({
      ...r,
      person_name: r.leads?.name ?? r.employees?.name ?? '–',
      kind_label: kindMap.get(r.kind_code) ?? r.kind_code ?? '–',
      creator_name: profileMap.get(r.created_by) ?? '–',
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (kindFilter !== 'all' && r.kind_code !== kindFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [r.person_name, r.contract_number, r.kind_label].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, kindFilter, statusFilter]);

  async function openDetail(r: ContractRow) {
    setDetail(r);
    setVersions([]);
    const { data } = await supabase.from('contract_versions')
      .select('id, version, created_at, snapshot')
      .eq('contract_id', r.id)
      .order('version', { ascending: false });
    setVersions((data as any) ?? []);
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 300);
    if (error) toast.error(error.message); else window.open(data.signedUrl, '_blank');
  }

  function fileLabel(path: string) {
    return path.split('/').pop() ?? path;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Person oder Vertragsnummer suchen…"
            className="pl-8"
          />
        </div>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vertragsart" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Vertragsarten</SelectItem>
            {kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!loading && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center space-y-3">
          <FileSignature className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Noch keine Verträge vorhanden</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Hier erscheinen alle erstellten Verträge mit ihren Dateien und Versionen.
              Erstellen Sie den ersten Vertrag über den Knopf «Neuer Vertrag».
            </p>
          </div>
          <Button onClick={onNewContract} className="gap-2"><Plus className="h-4 w-4" />Neuer Vertrag</Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vertragsnummer</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Vertragsart</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt von</TableHead>
                <TableHead>Erstelldatum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Lädt…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Verträge für diese Auswahl.</TableCell></TableRow>
              )}
              {filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r)}>
                  <TableCell className="font-mono text-xs">{r.contract_number || '–'}</TableCell>
                  <TableCell className="font-medium">{r.person_name}</TableCell>
                  <TableCell>{r.kind_label}</TableCell>
                  <TableCell className="text-center">v{r.current_version ?? 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ''}>
                      {CONTRACT_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.creator_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('de-CH')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={o => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {detail?.contract_number || 'Vertrag'} · {detail?.person_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className={STATUS_STYLES[detail.status] ?? ''}>
                  {CONTRACT_STATUS_LABELS[detail.status] ?? detail.status}
                </Badge>
                <span className="text-muted-foreground">{detail.kind_label}</span>
                <span className="text-muted-foreground">· Version {detail.current_version ?? 1}</span>
                <span className="text-muted-foreground">· Erstellt am {new Date(detail.created_at).toLocaleDateString('de-CH')} von {detail.creator_name}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Files className="h-4 w-4" />Dateien</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'Vertrag (PDF)', path: detail.pdf_path },
                    { label: 'Vertrag mit Anhängen (PDF)', path: detail.merged_pdf_path },
                    { label: 'Vertrag (Word)', path: detail.docx_path },
                  ].filter(f => f.path).map(f => (
                    <div key={f.path} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div>
                        <div className="font-medium">{f.label}</div>
                        <div className="text-xs text-muted-foreground">{fileLabel(f.path!)}</div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => download(f.path!)}>
                        <Download className="h-3.5 w-3.5" />Herunterladen
                      </Button>
                    </div>
                  ))}
                  {!detail.pdf_path && !detail.merged_pdf_path && !detail.docx_path && (
                    <p className="text-sm text-muted-foreground">Noch keine Dateien generiert.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Versionshistorie</h4>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine früheren Versionen vorhanden.</p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status damals</TableHead>
                          <TableHead className="text-right">Datei</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versions.map(v => {
                          const snap = v.snapshot ?? {};
                          const path = snap.merged_pdf_path || snap.pdf_path;
                          return (
                            <TableRow key={v.id}>
                              <TableCell>v{v.version}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString('de-CH')}</TableCell>
                              <TableCell>{CONTRACT_STATUS_LABELS[snap.status] ?? snap.status ?? '–'}</TableCell>
                              <TableCell className="text-right">
                                {path
                                  ? <Button size="sm" variant="ghost" onClick={() => download(path)}><Download className="h-3.5 w-3.5" /></Button>
                                  : <span className="text-xs text-muted-foreground">–</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
