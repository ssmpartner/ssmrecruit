import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_STATUS_LABELS } from '@/lib/contract-placeholders';

interface Props {
  contractId: string;
  open: boolean;
  onClose: () => void;
}

export default function ContractEditorDialog({ contractId, open, onClose }: Props) {
  const [contract, setContract] = useState<any>(null);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('contracts').select('*').eq('id', contractId).single();
      setContract(data);
      setBody(data?.body_html ?? '');
      setStatus(data?.status ?? 'draft');
    })();
  }, [contractId]);

  async function save() {
    const user = (await supabase.auth.getUser()).data.user;
    // Snapshot
    if (contract) {
      await supabase.from('contract_versions').insert({
        contract_id: contractId, version: contract.current_version,
        body_html: contract.body_html, pdf_path: contract.pdf_path,
        snapshot: { status: contract.status }, created_by: user?.id,
      });
    }
    const { error } = await supabase.from('contracts').update({
      body_html: body, status, current_version: (contract?.current_version ?? 1) + 1,
    }).eq('id', contractId);
    if (error) toast.error(error.message); else { toast.success('Gespeichert'); onClose(); }
  }

  async function exportPdf() {
    setExporting(true);
    const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
      body: { contract_id: contractId },
    });
    setExporting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('PDF generiert');
    if ((data as any)?.path) {
      const { data: s } = await supabase.storage.from('contracts').createSignedUrl((data as any).path, 300);
      if (s?.signedUrl) window.open(s.signedUrl, '_blank');
    }
  }

  async function downloadCurrent() {
    if (!contract?.pdf_path) return;
    const { data } = await supabase.storage.from('contracts').createSignedUrl(contract.pdf_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vertrag bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground self-end">Version {contract?.current_version ?? 1}</div>
          </div>
          <div>
            <Label>Vertragsinhalt (HTML)</Label>
            <Textarea rows={18} value={body} onChange={e => setBody(e.target.value)} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground mt-1">Änderungen gelten nur für diesen Vertrag. Die Originalvorlage bleibt unverändert.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium mb-2">Vorschau</p>
            <div className="prose prose-sm max-w-none bg-background p-3 rounded" dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {contract?.pdf_path && (
            <Button variant="outline" onClick={downloadCurrent} className="gap-2"><Download className="h-4 w-4" />Aktuelles PDF</Button>
          )}
          <Button variant="outline" onClick={exportPdf} disabled={exporting} className="gap-2">
            <FileDown className="h-4 w-4" />{exporting ? 'Generiere…' : 'PDF mit Briefpapier'}
          </Button>
          <Button onClick={save}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
