import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Download, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ContractWizardDialog from './ContractWizardDialog';
import ContractEditorDialog from './ContractEditorDialog';
import { AREA_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/contract-placeholders';

interface Props {
  leadId: string;
  leadName: string;
  leadStatus: string;
}

export default function LeadContractsSection({ leadId, leadName, leadStatus }: Props) {
  const { isSuperadmin } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [wizard, setWizard] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('contracts').select('*')
      .eq('candidate_lead_id', leadId)
      .order('created_at', { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [leadId]);

  if (!isSuperadmin) return null;
  if (leadStatus !== 'hired') return null;

  async function download(path: string) {
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 300);
    if (error) toast.error(error.message); else window.open(data.signedUrl, '_blank');
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileSignature className="h-4 w-4 text-primary" /> Verträge
        </div>
        <Button size="sm" variant="outline" onClick={() => setWizard(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Vertrag generieren
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch kein Vertrag generiert.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(r => (
            <li key={r.id} className="flex items-center justify-between rounded border p-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={r.area === 'sales' ? 'default' : 'secondary'} className="text-[10px]">{AREA_LABELS[r.area as 'sales' | 'office']}</Badge>
                <span>{r.position || '–'}</span>
                <Badge variant="outline" className="text-[10px]">{CONTRACT_STATUS_LABELS[r.status] ?? r.status}</Badge>
              </div>
              <div className="flex gap-1">
                {r.pdf_path && <Button size="sm" variant="ghost" onClick={() => download(r.pdf_path)}><Download className="h-3.5 w-3.5" /></Button>}
                <Button size="sm" variant="ghost" onClick={() => setEditId(r.id)}><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ContractWizardDialog
        leadId={leadId} leadName={leadName}
        open={wizard} onClose={() => { setWizard(false); load(); }}
      />
      {editId && (
        <ContractEditorDialog
          contractId={editId} open={!!editId}
          onClose={() => { setEditId(null); load(); }}
        />
      )}
    </div>
  );
}
