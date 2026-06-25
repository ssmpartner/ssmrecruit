import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileSignature, Download, Pencil, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import ContractGenerationWizard from './ContractGenerationWizard';
import ContractEditorDialog from './ContractEditorDialog';
import { AREA_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/contract-placeholders';

interface Props {
  leadId: string;
  leadName: string;
  leadStatus: string;
}

export default function LeadContractsSection({ leadId, leadName, leadStatus }: Props) {
  const { isSuperadmin, isAdmin } = useAuth() as any;
  const [rows, setRows] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const canManage = !!isSuperadmin || !!isAdmin;

  async function load() {
    const [{ data: contracts }, { data: lead }] = await Promise.all([
      supabase.from('contracts').select('*')
        .eq('candidate_lead_id', leadId)
        .order('created_at', { ascending: false }),
      supabase.from('leads').select('contract_generation_unlocked').eq('id', leadId).maybeSingle(),
    ]);
    setRows(contracts ?? []);
    setUnlocked(!!(lead as any)?.contract_generation_unlocked);
  }
  useEffect(() => { load(); }, [leadId]);

  if (!canManage) return null;

  const isHired = leadStatus === 'hired';
  const canGenerate = isHired || unlocked;

  async function toggleUnlock(v: boolean) {
    setUnlocked(v);
    const { error } = await supabase.from('leads')
      .update({ contract_generation_unlocked: v } as any)
      .eq('id', leadId);
    if (error) { toast.error(error.message); setUnlocked(!v); return; }
    toast.success(v ? 'Vertragsgenerierung freigegeben' : 'Freigabe entfernt');
  }

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
        {canGenerate && (
          <Button size="sm" variant="outline" onClick={() => setWizard(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />Vertrag generieren
          </Button>
        )}
      </div>

      {!isHired && (
        <div className="flex items-center justify-between rounded border border-dashed p-2 text-xs">
          <div className="flex items-center gap-2">
            <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Vertragsgenerierung manuell freigeben (Status ≠ Eingestellt)</span>
          </div>
          <Switch checked={unlocked} onCheckedChange={toggleUnlock} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {canGenerate ? 'Noch kein Vertrag generiert.' : 'Verfügbar, sobald der Kandidat „Eingestellt" ist oder die Freigabe aktiviert wird.'}
        </p>
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

      {wizard && (
        <ContractGenerationWizard
          leadId={leadId} leadName={leadName}
          open={wizard}
          onClose={() => { setWizard(false); load(); }}
          onCreated={(id) => setEditId(id)}
        />
      )}
      {editId && (
        <ContractEditorDialog
          contractId={editId} open={!!editId}
          onClose={() => { setEditId(null); load(); }}
        />
      )}
    </div>
  );
}
