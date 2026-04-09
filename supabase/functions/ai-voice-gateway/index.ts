import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-token, x-request-signature, x-source-runtime",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok<T>(data: T) {
  return json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
  });
}

function err(code: string, message: string, status = 400) {
  return json(
    { success: false, error: { code, message, statusCode: status }, meta: { timestamp: new Date().toISOString() } },
    status
  );
}

// ── Auth: supports both user JWT and service-to-service token ────

interface AuthResult {
  type: "user" | "service";
  userId?: string;
  serviceId?: string;
}

async function authenticate(req: Request): Promise<AuthResult | null> {
  // 1. Service-to-service token (Railway Voice Backend)
  const serviceToken = req.headers.get("x-service-token");
  if (serviceToken) {
    const expected = Deno.env.get("AI_VOICE_SERVICE_TOKEN");
    if (expected && serviceToken === expected) {
      return { type: "service", serviceId: "railway_voice_backend" };
    }
    // Fallback: accept placeholder token in dev
    if (!expected && serviceToken === "dev-placeholder-token") {
      return { type: "service", serviceId: "railway_voice_backend_dev" };
    }
    return null;
  }

  // 2. User JWT (frontend)
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (data?.user) return { type: "user", userId: data.user.id };
  }

  return null;
}

// ── Action Definitions ────────────────────────────────────────────

const VALID_ACTIONS = new Set([
  "set_status", "open_wizard", "create_followup", "create_task",
  "create_note", "assign_to_user", "escalate_to_human",
  "mark_wrong_number", "mark_no_interest", "mark_callback_requested",
  "mark_qualified", "mark_not_reached", "schedule_callback",
  "prepare_interview", "send_confirmation_placeholder",
]);

const AUTO_SAFE_ACTIONS = new Set([
  "create_note", "create_followup", "create_task",
  "mark_not_reached", "mark_wrong_number", "mark_callback_requested",
  "schedule_callback",
]);

const HIGH_RISK_ACTIONS = new Set([
  "mark_qualified", "mark_no_interest", "assign_to_user",
  "open_wizard", "prepare_interview",
]);

type ExecutionMode = "auto_executed" | "approved" | "suggested" | "shadow" | "blocked";
type RolloutMode = "off" | "shadow" | "recommendation" | "assisted" | "autonomous";

function resolveExecution(rollout: RolloutMode, action: string): ExecutionMode {
  switch (rollout) {
    case "off": return "blocked";
    case "shadow": return "shadow";
    case "recommendation": return "suggested";
    case "assisted": return "suggested";
    case "autonomous": return AUTO_SAFE_ACTIONS.has(action) ? "auto_executed" : "suggested";
    default: return "blocked";
  }
}

// ── Action Executors ──────────────────────────────────────────────

async function executeAction(body: any): Promise<string> {
  const { action_type, lead_id, payload = {} } = body;

  switch (action_type) {
    case "set_status": {
      if (!lead_id || !payload.newStatus) throw new Error("lead_id and payload.newStatus required");
      await supabase.from("leads").update({ status: payload.newStatus, updated_at: new Date().toISOString() }).eq("id", lead_id);
      return `Status auf "${payload.newStatus}" gesetzt`;
    }
    case "mark_no_interest": {
      if (!lead_id) throw new Error("lead_id required");
      await supabase.from("leads").update({ status: "Nicht interessiert", updated_at: new Date().toISOString() }).eq("id", lead_id);
      return 'Lead als "Nicht interessiert" markiert';
    }
    case "mark_wrong_number": {
      if (!lead_id) throw new Error("lead_id required");
      await supabase.from("leads").update({ status: "Falsche Nummer", updated_at: new Date().toISOString() }).eq("id", lead_id);
      return 'Lead als "Falsche Nummer" markiert';
    }
    case "mark_callback_requested": {
      if (!lead_id) throw new Error("lead_id required");
      await supabase.from("leads").update({ status: "Rückruf", updated_at: new Date().toISOString() }).eq("id", lead_id);
      return 'Lead als "Rückruf gewünscht" markiert';
    }
    case "mark_qualified": {
      if (!lead_id) throw new Error("lead_id required");
      await supabase.from("leads").update({ status: "Qualifiziert", updated_at: new Date().toISOString() }).eq("id", lead_id);
      return 'Lead als "Qualifiziert" markiert';
    }
    case "mark_not_reached": {
      if (!lead_id) throw new Error("lead_id required");
      await supabase.from("leads").update({ status: "Nicht erreicht", updated_at: new Date().toISOString() }).eq("id", lead_id);
      return 'Lead als "Nicht erreicht" markiert';
    }
    case "create_note": {
      if (!lead_id) throw new Error("lead_id required");
      const text = payload.text || "AI Voice Agent Notiz";
      await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "note", description: `🤖 ${text}`, user: "AI Voice Agent" });
      return `Notiz erstellt: "${text}"`;
    }
    case "create_followup":
    case "create_task": {
      const title = payload.title || `AI-Task: ${action_type}`;
      if (lead_id) {
        await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "note", description: `📋 Aufgabe: ${title}`, user: "AI Voice Agent" });
      }
      return `Aufgabe "${title}" erstellt`;
    }
    case "assign_to_user": {
      if (!lead_id || !payload.user_id) throw new Error("lead_id and payload.user_id required");
      await supabase.from("leads").update({ employee_id: payload.user_id, updated_at: new Date().toISOString() }).eq("id", lead_id);
      return `Lead dem Mitarbeiter zugewiesen`;
    }
    case "escalate_to_human": {
      await supabase.from("ai_voice_escalations").insert({
        session_id: body.session_id,
        agent_id: body.ai_agent_id,
        lead_id: lead_id || null,
        reason: body.reason || "AI Voice Agent Eskalation",
        priority: payload.priority || "medium",
        escalation_type: "ai_triggered",
        status: "open",
      });
      if (lead_id) {
        await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "note", description: `⚠️ Eskalation: ${body.reason || "Übergabe an Mitarbeiter"}`, user: "AI Voice Agent" });
      }
      return "Eskalation erstellt";
    }
    case "schedule_callback": {
      const d = payload.date || new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const t = payload.time || "10:00";
      if (lead_id) {
        await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "appointment", description: `📞 Rückruf geplant: ${d} um ${t}`, user: "AI Voice Agent" });
      }
      return `Rückruf geplant für ${d} um ${t}`;
    }
    case "prepare_interview": {
      if (lead_id) {
        await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "note", description: "🎯 Interview-Vorbereitung gestartet", user: "AI Voice Agent" });
      }
      return "Interview-Vorbereitung gestartet";
    }
    case "open_wizard": {
      const wt = payload.wizard_type || "recruiting";
      if (lead_id) {
        await supabase.from("activities").insert({ id: crypto.randomUUID(), lead_id, type: "status_change", description: `🔮 Wizard "${wt}" ausgelöst`, user: "AI Voice Agent" });
      }
      return `Wizard "${wt}" ausgelöst`;
    }
    case "send_confirmation_placeholder":
      return "Bestätigungs-Platzhalter vorbereitet (kein Versand)";
    default:
      return `Unbekannte Aktion: ${action_type}`;
  }
}

// ── Route: POST /execute ──────────────────────────────────────────

async function handleExecute(req: Request, auth: AuthResult) {
  const body = await req.json();
  const {
    action_type, session_id, ai_agent_id, lead_id, candidate_id,
    execution_mode: requestedMode, reason = "", confidence = 0,
    source = "ai_voice_agent", source_runtime = "unknown",
    payload = {}, audit_metadata = {},
  } = body;

  // Validate required fields
  if (!action_type || !VALID_ACTIONS.has(action_type)) {
    return err("INVALID_ACTION", `Unknown action: ${action_type}`, 400);
  }
  if (!session_id || !ai_agent_id) {
    return err("MISSING_FIELDS", "session_id and ai_agent_id are required", 400);
  }

  // Determine rollout mode
  const rollout: RolloutMode = requestedMode || "recommendation";
  const executionMode = resolveExecution(rollout, action_type);

  // Block high-risk actions in autonomous mode from service calls
  if (auth.type === "service" && executionMode === "auto_executed" && HIGH_RISK_ACTIONS.has(action_type)) {
    const logId = crypto.randomUUID();
    await supabase.from("ai_voice_action_logs").insert({
      id: logId,
      session_id,
      ai_agent_id,
      action_type,
      target_type: lead_id ? "lead" : "system",
      target_id: lead_id || candidate_id || "",
      execution_mode: "blocked",
      payload_json: { ...payload, source_runtime, audit_metadata },
      result: "blocked",
      result_json: { message: "High-risk action blocked in autonomous mode from service runtime", source_runtime },
      reason,
      executed_by: auth.serviceId || "service",
    });
    return ok({ id: logId, action_type, execution_mode: "blocked", success: false, message: "High-risk action blocked – requires manual approval" });
  }

  let success = true;
  let resultMessage = "";

  if (executionMode === "auto_executed") {
    try {
      resultMessage = await executeAction(body);
    } catch (e: any) {
      success = false;
      resultMessage = e.message || "Execution failed";
    }
  } else if (executionMode === "suggested") {
    resultMessage = `Action "${action_type}" suggested – awaiting approval`;
  } else if (executionMode === "shadow") {
    resultMessage = `Shadow mode: "${action_type}" logged, not executed`;
  } else {
    resultMessage = `Action "${action_type}" blocked (rollout: ${rollout})`;
  }

  // Log everything
  const logId = crypto.randomUUID();
  await supabase.from("ai_voice_action_logs").insert({
    id: logId,
    session_id,
    ai_agent_id,
    action_type,
    target_type: lead_id ? "lead" : "system",
    target_id: lead_id || candidate_id || "",
    execution_mode: executionMode,
    payload_json: { ...payload, source, source_runtime, confidence, audit_metadata },
    result: success ? "success" : "failed",
    result_json: { message: resultMessage, source_runtime, confidence, timestamp: new Date().toISOString() },
    reason,
    executed_by: auth.type === "service" ? (auth.serviceId || "service") : (auth.userId || "user"),
  });

  // Timeline log for leads
  if (lead_id && (executionMode === "auto_executed" || executionMode === "suggested")) {
    const modeLabel = executionMode === "auto_executed" ? "✅ Automatisch" : "💡 Vorgeschlagen";
    await supabase.from("activities").insert({
      id: crypto.randomUUID(),
      lead_id,
      type: executionMode === "auto_executed" ? "status_change" : "note",
      description: `🤖 AI Voice Agent – ${action_type}: ${modeLabel}. ${resultMessage}`,
      user: "AI Voice Agent",
    });
  }

  return ok({
    id: logId,
    action_type,
    execution_mode: executionMode,
    success,
    message: resultMessage,
    timestamp: new Date().toISOString(),
  });
}

// ── Route: POST /approve ──────────────────────────────────────────

async function handleApprove(req: Request, auth: AuthResult) {
  if (auth.type !== "user") return err("FORBIDDEN", "Only authenticated users can approve actions", 403);

  const { action_log_id, reason = "" } = await req.json();
  if (!action_log_id) return err("MISSING_FIELDS", "action_log_id required", 400);

  const { data: log } = await supabase.from("ai_voice_action_logs").select("*").eq("id", action_log_id).single();
  if (!log) return err("NOT_FOUND", "Action log not found", 404);
  if ((log as any).execution_mode !== "suggested") return err("INVALID_STATE", "Only suggested actions can be approved", 400);

  const entry = log as any;
  let resultMessage: string;
  let success = true;
  try {
    resultMessage = await executeAction({
      action_type: entry.action_type,
      session_id: entry.session_id,
      ai_agent_id: entry.ai_agent_id,
      lead_id: entry.target_type === "lead" ? entry.target_id : undefined,
      payload: entry.payload_json || {},
      reason: `Approved by ${auth.userId}`,
    });
  } catch (e: any) {
    success = false;
    resultMessage = e.message;
  }

  await supabase.from("ai_voice_action_logs").update({
    execution_mode: "approved",
    executed_by: auth.userId,
    result: success ? "success" : "failed",
    result_json: { message: resultMessage, approved_at: new Date().toISOString(), approved_reason: reason },
  } as any).eq("id", action_log_id);

  return ok({ id: action_log_id, action_type: entry.action_type, execution_mode: "approved", success, message: resultMessage });
}

// ── Route: POST /reject ───────────────────────────────────────────

async function handleReject(req: Request, auth: AuthResult) {
  if (auth.type !== "user") return err("FORBIDDEN", "Only authenticated users can reject actions", 403);

  const { action_log_id, reason = "Manuell abgelehnt" } = await req.json();
  if (!action_log_id) return err("MISSING_FIELDS", "action_log_id required", 400);

  await supabase.from("ai_voice_action_logs").update({
    execution_mode: "blocked",
    executed_by: auth.userId,
    result: "blocked",
    result_json: { message: `Rejected: ${reason}`, rejected_at: new Date().toISOString() },
  } as any).eq("id", action_log_id);

  return ok({ id: action_log_id, status: "rejected" });
}

// ── Route: POST /batch ────────────────────────────────────────────

async function handleBatch(req: Request, auth: AuthResult) {
  const { actions } = await req.json();
  if (!Array.isArray(actions) || actions.length === 0) return err("INVALID_BODY", "actions array required", 400);
  if (actions.length > 20) return err("BATCH_LIMIT", "Max 20 actions per batch", 400);

  const results = [];
  for (const action of actions) {
    const fakeReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(action),
    });
    const res = await handleExecute(fakeReq, auth);
    const resBody = await res.json();
    results.push(resBody.data || resBody.error);
  }
  return ok(results);
}

// ── Route: GET /pending ───────────────────────────────────────────

async function handlePending(url: URL) {
  const leadId = url.searchParams.get("lead_id");
  let q = supabase.from("ai_voice_action_logs").select("*")
    .eq("execution_mode", "suggested")
    .eq("result", "success")
    .order("created_at", { ascending: false })
    .limit(100);
  if (leadId) q = q.eq("target_id", leadId);
  const { data } = await q;
  return ok(data ?? []);
}

// ── Route: GET /history ───────────────────────────────────────────

async function handleHistory(url: URL) {
  const sessionId = url.searchParams.get("session_id");
  const leadId = url.searchParams.get("lead_id");
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 50));
  let q = supabase.from("ai_voice_action_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (sessionId) q = q.eq("session_id", sessionId);
  if (leadId) q = q.eq("target_id", leadId);
  const { data } = await q;
  return ok(data ?? []);
}

// ── Route: GET /health ────────────────────────────────────────────

function handleHealth() {
  const hasServiceToken = !!Deno.env.get("AI_VOICE_SERVICE_TOKEN");
  return ok({
    status: "operational",
    service_auth_configured: hasServiceToken,
    environment: hasServiceToken ? "configured" : "dev_placeholder",
    supported_actions: [...VALID_ACTIONS],
    timestamp: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/ai-voice-gateway/, "");

    // Health endpoint is public
    if (req.method === "GET" && (pathname === "/health" || pathname === "")) {
      return handleHealth();
    }

    // All other routes require auth
    const auth = await authenticate(req);
    if (!auth) return err("UNAUTHORIZED", "Authentication required. Provide Bearer token or x-service-token header.", 401);

    // Route matching
    if (req.method === "POST" && pathname === "/execute") return await handleExecute(req, auth);
    if (req.method === "POST" && pathname === "/approve") return await handleApprove(req, auth);
    if (req.method === "POST" && pathname === "/reject") return await handleReject(req, auth);
    if (req.method === "POST" && pathname === "/batch") return await handleBatch(req, auth);
    if (req.method === "GET" && pathname === "/pending") return await handlePending(url);
    if (req.method === "GET" && pathname === "/history") return await handleHistory(url);

    return err("NOT_FOUND", `Route ${req.method} ${pathname} not found`, 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    console.error("Gateway error:", msg);
    return err("INTERNAL", msg, 500);
  }
});
