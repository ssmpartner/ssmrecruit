import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Pencil, History } from 'lucide-react';
import { toast } from 'sonner';
import { AREA_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/contract-placeholders';
import ContractEditorDialog from './ContractEditorDialog';

type ContractRow = {
  id: string;
  candidate_lead_id: string | null;
  area: 'sales' | 'office';
  language: string;
  position: string | null;
  level: string | null;
  careerplan_level: string | null;
  status: string;
  pdf_path: string | null;
  created_at: string;
  created_by: string | null;
  template_id: string | null;
  current_version: number;
  lead_name?: string | null;
  template_title?: string | null;
  creator_name?: string | null;
};

export default function ContractsOverviewTab() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('contracts')
      .select('*, leads:candidate_lead_id(name), contract_templates:template_id(title)')
      .order('created_at', { ascending: false });
    setRows((data ?? []).map((r: any) => ({
      ...r,
      lead_name: r.leads?.name ?? null,
      template_title: r.contract_templates?.title ?? null,
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function download(path: string) {
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 300);
    if (error) toast.error(error.message); else window.open(data.signedUrl, '_blank');
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kandidat</TableHead>
              <TableHead>Bereich</TableHead>
              <TableHead>Vorlage</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Stufe</TableHead>
              <TableHead>Karriereplan</TableHead>
              <TableHead>Sprache</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Lädt…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Noch keine Verträge generiert.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.lead_name || '–'}</TableCell>
                <TableCell><Badge variant={r.area === 'sales' ? 'default' : 'secondary'}>{AREA_LABELS[r.area]}</Badge></TableCell>
                <TableCell>{r.template_title || '–'}</TableCell>
                <TableCell>{r.position || '–'}</TableCell>
                <TableCell>{r.level || '–'}</TableCell>
                <TableCell>{r.area === 'sales' ? (r.careerplan_level || '–') : '–'}</TableCell>
                <TableCell className="uppercase text-xs">{r.language}</TableCell>
                <TableCell><Badge variant="outline">{CONTRACT_STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('de-CH')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {r.pdf_path && (
                      <Button size="sm" variant="ghost" onClick={() => download(r.pdf_path!)} title="PDF herunterladen"><Download className="h-3.5 w-3.5" /></Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditId(r.id)} title="Bearbeiten"><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editId && (
        <ContractEditorDialog
          contractId={editId}
          open={!!editId}
          onClose={() => { setEditId(null); load(); }}
        />
      )}
    </div>
  );
}
