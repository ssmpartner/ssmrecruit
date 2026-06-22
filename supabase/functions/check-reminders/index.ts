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

        // GL-Stufe: Nur diejenigen GL-Mitglieder benachrichtigen, die noch NICHT entschieden haben
        if (lead.status === 'controlling_approved' || lead.status === 'management_review') {
          const [{ data: glUsers }, { data: approvals }] = await Promise.all([
            supabase.rpc('get_geschaeftsleitung_users'),
            supabase.from('lead_management_approvals').select('user_id').eq('lead_id', lead.id),
          ]);
          const decidedIds = new Set((approvals || []).map((a: any) => a.user_id));
          const pendingGL = (glUsers || []).filter((g: any) => !decidedIds.has(g.user_id));
          if (pendingGL.length === 0) continue;

          // Mitarbeiter-Emails laden
          const { data: emps } = await supabase
            .from('employees')
            .select('user_id, name, email')
            .in('user_id', pendingGL.map((g: any) => g.user_id));

          const title = `Erinnerung: ${lead.name ?? lead.id}`;
          const description = 'Ihre Freigabe-Entscheidung steht seit > 24h aus. Bitte freigeben oder ablehnen.';

          // In-App Notifications gezielt an offene GL-User
          await supabase.from('notifications').insert(
            pendingGL.map((g: any) => ({
              type: 'approval_reminder',
              title,
              description,
              lead_id: lead.id,
              recipient_user_id: g.user_id,
            })),
          );

          // E-Mail nur an offene GL-User
          const recipients = (emps || []).map((e: any) => e.email).filter(Boolean);
          if (recipients.length > 0) {
            const html = `<div style="font-family:'DM Sans',Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
              <div style="border-left:4px solid #324642;padding:8px 16px;margin-bottom:20px;">
                <h2 style="margin:0;font-family:'Space Grotesk',Arial,sans-serif;color:#324642;">${title}</h2>
              </div>
              <p style="font-size:14px;line-height:1.6;">${description}</p>
              <div style="margin-top:24px;"><a href="https://recruit.ssmpartner.ch/leads?lead=${encodeURIComponent(lead.id)}" style="background:#324642;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Im System öffnen</a></div>
              <p style="margin-top:32px;color:#999;font-size:12px;">SSM Recruit · automatische Benachrichtigung</p>
            </div>`;
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                to: recipients,
                subject: title,
                html,
                audience: 'internal',
                tags: [{ name: 'type', value: 'approval_reminder_gl' }],
              }),
            });

            // Activity log
            await supabase.from('notification_activity_log').insert(
              (emps || []).map((e: any) => ({
                notification_type: 'approval_reminder',
                trigger_source: 'system_cron',
                trigger_label: `approval_reminder_gl:pending`,
                entity_type: 'lead',
                entity_id: lead.id,
                subject: title,
                channel: 'email',
                recipient_user_id: e.user_id,
                recipient_email: e.email,
                recipient_name: e.name,
                status: 'sent',
              })),
            );
          }
        } else {
          // Controlling-Stufe (oder andere): wie gehabt an Rollen-Empfänger
          await supabase.rpc('dispatch_notification', {
            _type: 'approval_reminder',
            _entity_type: 'lead',
            _entity_id: lead.id,
            _lead_id: lead.id,
            _title: `Erinnerung: ${lead.name ?? lead.id}`,
            _description: 'wartet seit > 24h auf Controlling-Prüfung',
            _trigger_label: `approval_reminder:${lead.status}`,
            _triggered_by: null,
          });
        }

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
