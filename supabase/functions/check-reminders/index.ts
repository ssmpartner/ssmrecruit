import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const results = { insightsReminders: 0, documentReminders: 0, approvalReminders: 0 };

    // === Hängende Freigaben > 24h ===
    const approvalCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stuckLeads } = await supabase
      .from('leads')
      .select('id, name, status, updated_at, last_approval_reminder_at')
      .in('status', ['ready_for_controlling', 'controlling_approved', 'management_review'])
      .lt('updated_at', approvalCutoff);

    if (stuckLeads && stuckLeads.length > 0) {
      for (const lead of stuckLeads) {
        // Nur erinnern, wenn seit letzter Erinnerung > 24h oder noch nie
        if (lead.last_approval_reminder_at) {
          const last = new Date(lead.last_approval_reminder_at).getTime();
          if (now.getTime() - last < 24 * 60 * 60 * 1000) continue;
        }

        const statusLabel: Record<string, string> = {
          ready_for_controlling: 'wartet seit > 24h auf Controlling-Prüfung',
          controlling_approved: 'wartet seit > 24h auf Geschäftsleitung-Freigabe',
          management_review: 'wartet seit > 24h auf Geschäftsleitung-Freigabe',
        };

        await supabase.rpc('dispatch_notification', {
          _type: 'approval_reminder',
          _entity_type: 'lead',
          _entity_id: lead.id,
          _lead_id: lead.id,
          _title: `Erinnerung: ${lead.name ?? lead.id}`,
          _description: statusLabel[lead.status] ?? 'Freigabe hängt seit > 24h',
          _trigger_label: `approval_reminder:${lead.status}`,
          _triggered_by: null,
        });

        await supabase
          .from('leads')
          .update({ last_approval_reminder_at: now.toISOString() })
          .eq('id', lead.id);

        results.approvalReminders++;
      }
    }

    // Check insights requests pending > 24h without reminder
    const insightsCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingInsights } = await supabase
      .from('insights_requests')
      .select('id, lead_id, token')
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .lt('sent_at', insightsCutoff);

    if (pendingInsights && pendingInsights.length > 0) {
      for (const req of pendingInsights) {
        // Mark reminder sent
        await supabase
          .from('insights_requests')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', req.id);

        // Get lead name
        const { data: lead } = await supabase
          .from('leads')
          .select('name')
          .eq('id', req.lead_id)
          .single();

        // Create notification for recruiter
        await supabase.from('notifications').insert({
          title: 'Insights-Erinnerung',
          type: 'reminder',
          description: `${lead?.name || 'Ein Lead'} hat das Insights-Formular seit 24h nicht ausgefüllt.`,
          lead_id: req.lead_id,
        });

        results.insightsReminders++;
      }
    }

    // Check document requests pending > 48h without reminder
    const docsCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: pendingDocs } = await supabase
      .from('document_requests')
      .select('id, lead_id, token')
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .lt('sent_at', docsCutoff);

    if (pendingDocs && pendingDocs.length > 0) {
      for (const req of pendingDocs) {
        await supabase
          .from('document_requests')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', req.id);

        const { data: lead } = await supabase
          .from('leads')
          .select('name')
          .eq('id', req.lead_id)
          .single();

        await supabase.from('notifications').insert({
          title: 'Dokumente-Erinnerung',
          type: 'reminder',
          description: `${lead?.name || 'Ein Lead'} hat seit 48h keine Dokumente hochgeladen.`,
          lead_id: req.lead_id,
        });

        results.documentReminders++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reminder check error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
