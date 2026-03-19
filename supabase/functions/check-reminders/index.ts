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
    const results = { insightsReminders: 0, documentReminders: 0 };

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
