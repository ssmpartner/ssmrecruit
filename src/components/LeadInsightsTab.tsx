import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, CheckCircle2, Clock, Copy, Check, Loader2, CalendarPlus, CalendarCheck, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InsightsTab from './InsightsTab';
import { useLeads } from '@/context/useLeads';

interface Props {
  leadId: string;
  leadName: string;
}

interface InsightsRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
  completed_at: string | null;
  responses: Record<string, string>;
}

interface AppointmentSuggestion {
  id: string;
  lead_id: string;
  suggested_date: string;
  suggested_time: string;
  status: string;
  responded_at: string | null;
}

const insightsQuestionLabels: Record<string, string> = {
  motivation: 'Motivation',
  experience: 'Erfahrung',
  availability: 'Verfügbarkeit',
  goals: 'Ziele',
  strengths: 'Stärken',
  salary: 'Gehaltsvorstellung',
};

export default function LeadInsightsTab({ leadId, leadName }: Props) {
  const { discResults, addActivity } = useLeads();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insightsRequests, setInsightsRequests] = useState<InsightsRequest[]>([]);
  const [appointmentSuggestions, setAppointmentSuggestions] = useState<AppointmentSuggestion[]>([]);
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState('');

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`insights-tab-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_suggestions', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [insRes, sugRes] = await Promise.all([
      supabase.from('insights_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('appointment_suggestions').select('*').eq('lead_id', leadId).order('suggested_date', { ascending: true }),
    ]);
    if (insRes.data) setInsightsRequests(insRes.data as any[]);
    if (sugRes.data) setAppointmentSuggestions(sugRes.data as any[]);
    setLoading(false);
  }

  function getPublicUrl(token: string) {
    return `${window.location.origin}/insights-form?token=${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast({ title: 'Kopiert!', description: 'Link in der Zwischenablage.' });
  }

  async function handleSuggestionAction(id: string, action: 'accepted' | 'declined') {
    await supabase.from('appointment_suggestions').update({
      status: action,
      responded_at: new Date().toISOString(),
    }).eq('id', id);

    if (action === 'accepted') {
      const suggestion = appointmentSuggestions.find(s => s.id === id);
      if (suggestion) {
        addActivity(leadId, 'appointment', `Terminvorschlag angenommen: ${new Date(suggestion.suggested_date).toLocaleDateString('de-CH')} um ${suggestion.suggested_time}`);
        const otherPending = appointmentSuggestions.filter(s => s.id !== id && s.status === 'pending');
        for (const other of otherPending) {
          await supabase.from('appointment_suggestions').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', other.id);
        }
      }
    } else {
      addActivity(leadId, 'note', 'Terminvorschlag abgelehnt');
    }
    toast({ title: action === 'accepted' ? '✅ Termin angenommen' : '❌ Termin abgelehnt' });
    loadData();
  }

  const hasDisc = discResults.some(d => d.leadId === leadId);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const completedInsights = insightsRequests.filter(r => r.status === 'completed');
  const pendingInsights = insightsRequests.filter(r => r.status !== 'completed');
  const hasContent = hasDisc || completedInsights.length > 0 || pendingInsights.length > 0 || appointmentSuggestions.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Noch keine Insights vorhanden</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Senden Sie einen Insights & DISC-Link über das Aktionspanel links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DISC Results */}
      {hasDisc && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">DISC-Ergebnisse</h5>
          </div>
          <InsightsTab leadId={leadId} leadName={leadName} />
        </div>
      )}

      {/* Completed Insights */}
      {completedInsights.map(req => (
        <div key={req.id} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Insights-Antworten</span>
              <span className="text-xs text-muted-foreground">
                {new Date(req.completed_at!).toLocaleDateString('de-CH')}
              </span>
            </div>
            <button
              onClick={() => setExpandedInsights(expandedInsights === req.id ? null : req.id)}
              className="text-xs text-primary hover:underline"
            >
              {expandedInsights === req.id ? 'Ausblenden' : 'Anzeigen'}
            </button>
          </div>
          {expandedInsights === req.id && req.responses && (
            <div className="space-y-2 mt-2">
              {Object.entries(req.responses).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-muted/30 border p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {insightsQuestionLabels[key] || key}
                  </p>
                  <p className="text-sm mt-1 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Appointment Suggestions */}
      {appointmentSuggestions.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">Terminvorschläge vom Kandidaten</h5>
          </div>
          {appointmentSuggestions.map(s => {
            const dateStr = new Date(s.suggested_date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                s.status === 'accepted' ? 'bg-primary/5 border-primary/30' :
                s.status === 'declined' ? 'bg-muted/30 border-muted opacity-60' :
                'bg-background border-border'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.status === 'declined' ? 'line-through text-muted-foreground' : ''}`}>
                    {dateStr} um {s.suggested_time} Uhr
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.status === 'pending' && 'Ausstehend'}
                    {s.status === 'accepted' && '✅ Angenommen'}
                    {s.status === 'declined' && '❌ Abgelehnt'}
                  </p>
                </div>
                {s.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleSuggestionAction(s.id, 'accepted')}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                      <CalendarCheck className="h-3 w-3" /> Annehmen
                    </button>
                    <button onClick={() => handleSuggestionAction(s.id, 'declined')}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                      <X className="h-3 w-3" /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Insights */}
      {pendingInsights.map(req => (
        <div key={req.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-xs">Insights & DISC-Link ausstehend</span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(req.sent_at).toLocaleDateString('de-CH')}
            </span>
          </div>
          <button onClick={() => copyLink(req.token)}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors">
            {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            {copiedToken === req.token ? 'Kopiert' : 'Link'}
          </button>
        </div>
      ))}
    </div>
  );
}
