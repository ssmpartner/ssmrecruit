import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone, PhoneForwarded, PhoneOff, UserX, Ban, ThumbsDown, Building2,
  Clock, MessageSquare, AlertTriangle, CheckCircle2, User
} from 'lucide-react';

const WIZARD_LABELS: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  contacted: { label: 'Kontaktiert', icon: Phone, color: 'bg-emerald-100 text-emerald-700' },
  callback: { label: 'Rückruf gewünscht', icon: PhoneForwarded, color: 'bg-amber-100 text-amber-700' },
  not_interested: { label: 'Nicht interessiert', icon: UserX, color: 'bg-red-100 text-red-700' },
  not_reached: { label: 'Nicht erreicht', icon: PhoneOff, color: 'bg-orange-100 text-orange-700' },
  no_need: { label: 'Kein Bedarf', icon: Ban, color: 'bg-rose-100 text-rose-700' },
  not_suitable: { label: 'Nicht passend', icon: ThumbsDown, color: 'bg-slate-100 text-slate-700' },
  internal: { label: 'Interne Stelle', icon: Building2, color: 'bg-blue-100 text-blue-700' },
};

const REASON_LABELS: Record<string, string> = {
  has_job: 'Hat bereits Stelle',
  no_career_change: 'Kein Quereinsteiger',
  mistake: 'Irrtümlich',
  no_position: 'Keine passende Stelle',
  unfulfillable: 'Wunsch nicht erfüllbar',
  other: 'Sonstiges',
  appointment: 'Termin vereinbart',
  reached_no_appointment: 'Erreicht ohne Termin',
  completed: 'Kontakt abgeschlossen',
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  email: 'E-Mail',
  sms: 'SMS',
};

interface WizardResult {
  id: string;
  wizard_type: string;
  answers: Record<string, any>;
  feedback: string;
  completed_by: string;
  original_employee_id: string;
  lead_withdrawn: boolean;
  reassigned_to: string;
  created_at: string;
}

export default function WizardHistoryPanel({ leadId }: { leadId: string }) {
  const [results, setResults] = useState<WizardResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('status_wizard_results')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (data) setResults(data as any);
      setLoading(false);
    }
    load();
  }, [leadId]);

  if (loading) return <p className="text-xs text-muted-foreground py-4 text-center">Lade Wizard-Historie...</p>;
  if (results.length === 0) return <p className="text-xs text-muted-foreground py-8 text-center">Keine Wizard-Einträge</p>;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Wizard-Historie</h4>
      {results.map((r, i) => {
        const cfg = WIZARD_LABELS[r.wizard_type] || { label: r.wizard_type, icon: Clock, color: 'bg-muted text-muted-foreground' };
        const Icon = cfg.icon;
        return (
          <div key={r.id} className="relative">
            {i < results.length - 1 && <div className="absolute left-[15px] top-9 bottom-0 w-px bg-border" />}
            <div className="flex gap-3">
              <div className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{cfg.label}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString('de-CH')}</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" /> {r.completed_by}
                </p>

                {/* Answers */}
                <div className="mt-1.5 space-y-0.5">
                  {Object.entries(r.answers).map(([key, value]) => {
                    if (key === 'escalated' && value) return (
                      <p key={key} className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Eskaliert (Rückruflimit erreicht)
                      </p>
                    );
                    const label = REASON_LABELS[String(value)] || String(value);
                    return (
                      <p key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>: {typeof value === 'boolean' ? (value ? 'Ja' : 'Nein') : label}
                      </p>
                    );
                  })}
                </div>

                {r.feedback && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-muted/50 p-2">
                    <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs">{r.feedback}</p>
                  </div>
                )}

                {r.lead_withdrawn && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> Lead entzogen → {r.reassigned_to || 'Superadmin'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
