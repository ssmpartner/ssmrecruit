import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Copy, Send, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StepActionsPanel from './StepActionsPanel';
import { type LeadStatus } from '@/lib/mock-data';

interface Props {
  leadId: string;
  leadName: string;
  leadStatus: LeadStatus;
  onScheduleAppointment: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function LeadActionPanel({ leadId, leadName, leadStatus, onScheduleAppointment, onNavigateToTab }: Props) {
  const { toast } = useToast();
  const [sendingInsights, setSendingInsights] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [newLink, setNewLink] = useState<{ type: 'insights' | 'documents'; url: string } | null>(null);
  const [processData, setProcessData] = useState({ insightsSent: false, insightsCompleted: false, docsCompleted: false });
  const [loaded, setLoaded] = useState(false);

  // Load process state on mount
  useState(() => {
    (async () => {
      const [insRes, docRes] = await Promise.all([
        supabase.from('insights_requests').select('status').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1),
        supabase.from('document_requests').select('status').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1),
      ]);
      setProcessData({
        insightsSent: !!(insRes.data && insRes.data.length > 0),
        insightsCompleted: insRes.data?.[0]?.status === 'completed',
        docsCompleted: docRes.data?.[0]?.status === 'completed',
      });
      setLoaded(true);
    })();
  });

  async function createInsightsRequest() {
    setSendingInsights(true);
    const { data, error } = await supabase
      .from('insights_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingInsights(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Insights & DISC-Test-Link erstellt', user: 'System',
    });

    const url = `${window.location.origin}/insights-form?token=${(data as any).token}`;
    await navigator.clipboard.writeText(url);
    setNewLink({ type: 'insights', url });
    setProcessData(prev => ({ ...prev, insightsSent: true }));
    toast({ title: '✅ Link erstellt & kopiert' });
    setSendingInsights(false);
  }

  async function createDocumentRequest(kind: 'application' | 'employment' = 'application') {
    setSendingDocs(true);
    const { data, error } = await supabase
      .from('document_requests')
      .insert({ lead_id: leadId, sent_via: 'manual', kind } as any)
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingDocs(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: kind === 'employment'
        ? 'Arbeitsvertrag-Dokumenten-Link erstellt (mit Personalstammdaten)'
        : 'Bewerbungs-Dokumenten-Link erstellt',
      user: 'System',
    });

    const url = `${window.location.origin}/document-upload?token=${(data as any).token}`;
    await navigator.clipboard.writeText(url);
    setNewLink({ type: 'documents', url });
    toast({ title: kind === 'employment' ? '✅ Arbeitsvertrag-Link erstellt & kopiert' : '✅ Bewerbungs-Link erstellt & kopiert' });
    setSendingDocs(false);
  }

  return (
    <div className="space-y-4">
      <StepActionsPanel
        leadId={leadId}
        leadName={leadName}
        leadStatus={leadStatus}
        onScheduleAppointment={onScheduleAppointment}
        onOpenInsights={createInsightsRequest}
        onOpenDocuments={createDocumentRequest}
        discCompleted={processData.insightsCompleted}
        documentsCompleted={processData.docsCompleted}
        insightsSent={processData.insightsSent}
      />

      {/* Newly created link - dismissable */}
      {newLink && (
        <div className={`rounded-lg border p-3 space-y-2 ${
          newLink.type === 'insights' 
            ? 'border-violet-200 bg-violet-50/50' 
            : 'border-blue-200 bg-blue-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {newLink.type === 'insights' 
                ? <Brain className="h-3.5 w-3.5 text-violet-600" />
                : <Upload className="h-3.5 w-3.5 text-blue-600" />
              }
              <span className="text-xs font-semibold">
                {newLink.type === 'insights' ? 'Insights-Link' : 'Upload-Link'} erstellt
              </span>
            </div>
            <button onClick={() => setNewLink(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <div className="flex gap-2">
            <input readOnly value={newLink.url}
              className="flex-1 h-7 rounded border bg-background px-2 text-[11px] outline-none"
              onClick={e => (e.target as HTMLInputElement).select()} />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(newLink.url);
                toast({ title: 'Kopiert!' });
              }}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-white transition-colors ${
                newLink.type === 'insights' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Copy className="h-3 w-3" /> Kopieren
            </button>
          </div>
        </div>
      )}

      {/* Quick navigation to results */}
      {(processData.insightsCompleted || processData.docsCompleted) && (
        <div className="space-y-1.5">
          {processData.insightsCompleted && (
            <button onClick={() => onNavigateToTab('insights')}
              className="w-full flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 transition-colors">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Insights & DISC ansehen →</span>
            </button>
          )}
          {processData.docsCompleted && (
            <button onClick={() => onNavigateToTab('documents')}
              className="w-full flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 transition-colors">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Dokumente ansehen →</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
