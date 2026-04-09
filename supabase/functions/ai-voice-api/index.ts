import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

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
  return json({ success: true, data, meta: { timestamp: new Date().toISOString() } });
}

function error(code: string, message: string, status = 400) {
  return json({ success: false, error: { code, message, statusCode: status } }, status);
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  return data?.user ?? null;
}

function parseFilters(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
  const sortBy = url.searchParams.get("sortBy") ?? "created_at";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? true : false;
  return { page, pageSize, sortBy, sortDir, from: (page - 1) * pageSize };
}

async function paginate(table: string, url: URL, buildQuery: (q: any) => any) {
  const { page, pageSize, sortBy, sortDir, from } = parseFilters(url);
  let q = supabase.from(table).select("*", { count: "exact" });
  q = buildQuery(q);
  q = q.order(sortBy, { ascending: sortDir }).range(from, from + pageSize - 1);
  const { data, error: err, count } = await q;
  if (err) throw err;
  const total = count ?? 0;
  return { data: data ?? [], pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: from + pageSize < total } };
}

// ── Route Matcher ─────────────────────────────────────────────────

type Handler = (req: Request, url: URL, params: Record<string, string>) => Promise<Response>;

const routes: { method: string; pattern: RegExp; handler: Handler }[] = [];

function route(method: string, path: string, handler: Handler) {
  const pattern = new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
  routes.push({ method, pattern, handler });
}

function matchRoute(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
  for (const r of routes) {
    if (r.method !== method && r.method !== "ALL") continue;
    const m = pathname.match(r.pattern);
    if (m) return { handler: r.handler, params: m.groups ?? {} };
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════

// ── Agents ────────────────────────────────────────────────────────

route("GET", "/agents", async (_req, url) => {
  const result = await paginate("ai_agents", url, (q: any) => {
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    if (status) q = q.eq("status", status);
    if (search) q = q.ilike("name", `%${search}%`);
    return q.is("deleted_at", null);
  });
  return ok(result);
});

route("GET", "/agents/:id", async (_req, _url, p) => {
  const { data, error: err } = await supabase.from("ai_agents").select("*").eq("id", p.id).single();
  if (err) return error("NOT_FOUND", `Agent ${p.id} not found`, 404);
  return ok(data);
});

route("GET", "/agents/:id/versions", async (_req, url, p) => {
  const result = await paginate("ai_agent_versions", url, (q: any) => q.eq("agent_id", p.id));
  return ok(result);
});

// ── Deployments ───────────────────────────────────────────────────

route("GET", "/deployments", async (_req, url) => {
  const result = await paginate("ai_agent_deployments", url, (q: any) => {
    const agentId = url.searchParams.get("agentId");
    const status = url.searchParams.get("status");
    if (agentId) q = q.eq("agent_id", agentId);
    if (status) q = q.eq("status", status);
    return q;
  });
  return ok(result);
});

// ── Campaigns ─────────────────────────────────────────────────────

route("GET", "/campaigns", async (_req, url) => {
  const result = await paginate("ai_voice_campaigns", url, (q: any) => {
    const status = url.searchParams.get("status");
    if (status) q = q.eq("status", status);
    return q;
  });
  return ok(result);
});

// ── Sessions ──────────────────────────────────────────────────────

route("GET", "/sessions", async (_req, url) => {
  const result = await paginate("ai_voice_sessions", url, (q: any) => {
    const agentId = url.searchParams.get("agentId");
    const status = url.searchParams.get("status");
    const direction = url.searchParams.get("direction");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    if (agentId) q = q.eq("agent_id", agentId);
    if (status) q = q.eq("status", status);
    if (direction) q = q.eq("direction", direction);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", dateTo);
    return q;
  });
  return ok(result);
});

route("GET", "/sessions/:id/turns", async (_req, url, p) => {
  const result = await paginate("ai_voice_turns", url, (q: any) => q.eq("session_id", p.id));
  return ok(result);
});

// ── Escalations ───────────────────────────────────────────────────

route("GET", "/escalations", async (_req, url) => {
  const result = await paginate("ai_voice_escalations", url, (q: any) => {
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);
    return q;
  });
  return ok(result);
});

// ── Knowledge ─────────────────────────────────────────────────────

route("GET", "/knowledge", async (_req, url) => {
  const result = await paginate("ai_voice_knowledge_items", url, (q: any) => {
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    if (category) q = q.eq("category", category);
    if (search) q = q.ilike("title", `%${search}%`);
    return q;
  });
  return ok(result);
});

// ── Action Rules (via action_logs) ────────────────────────────────

route("GET", "/action-rules", async (_req, url) => {
  const result = await paginate("ai_voice_action_logs", url, (q: any) => q);
  return ok(result);
});

// ── Provider Configs ──────────────────────────────────────────────

route("GET", "/provider-configs", async () => {
  const { data } = await supabase.from("ai_provider_configs").select("*").order("created_at", { ascending: false });
  return ok(data ?? []);
});

// ── Cost Control ──────────────────────────────────────────────────

route("GET", "/cost-control", async (_req, url) => {
  const result = await paginate("ai_voice_cost_logs", url, (q: any) => {
    const agentId = url.searchParams.get("agentId");
    const dateFrom = url.searchParams.get("dateFrom");
    if (agentId) q = q.eq("agent_id", agentId);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    return q;
  });
  return ok(result);
});

// ── Analytics ─────────────────────────────────────────────────────

route("GET", "/analytics", async (_req, url) => {
  const agentId = url.searchParams.get("agentId");
  let q = supabase.from("ai_voice_sessions").select("status, direction, outcome, cost_total, result_type, is_test").eq("is_test", false);
  if (agentId) q = q.eq("agent_id", agentId);
  const { data } = await q;
  const s = data ?? [];
  const total = s.length;
  const connected = s.filter((r: any) => r.status === "completed").length;
  return ok({
    totalCalls: total,
    outbound: s.filter((r: any) => r.direction === "outbound").length,
    inbound: s.filter((r: any) => r.direction === "inbound").length,
    connectedRate: total ? Math.round((connected / total) * 100) : 0,
    totalCost: s.reduce((a: number, r: any) => a + Number(r.cost_total || 0), 0),
  });
});

// ── Audit ─────────────────────────────────────────────────────────

route("GET", "/audit", async (_req, url) => {
  const result = await paginate("ai_audit_logs", url, (q: any) => {
    const tableName = url.searchParams.get("tableName");
    if (tableName) q = q.eq("table_name", tableName);
    return q;
  });
  return ok(result);
});

// ── Test Center ───────────────────────────────────────────────────

route("GET", "/test-center", async (_req, url) => {
  const result = await paginate("ai_voice_test_runs", url, (q: any) => {
    const agentId = url.searchParams.get("agentId");
    if (agentId) q = q.eq("agent_id", agentId);
    return q;
  });
  return ok(result);
});

// ── Webhooks (placeholder) ────────────────────────────────────────

route("POST", "/webhooks", async (req) => {
  const body = await req.json();
  return ok({ accepted: true, event: body.event ?? "unknown", message: "Webhook received (mock)" });
});

// ── System Health ─────────────────────────────────────────────────

route("GET", "/system-health", async () => {
  const [agents, deployments, campaigns] = await Promise.all([
    supabase.from("ai_agents").select("status", { count: "exact" }).is("deleted_at", null),
    supabase.from("ai_agent_deployments").select("status", { count: "exact" }),
    supabase.from("ai_voice_campaigns").select("status", { count: "exact" }),
  ]);

  const activeAgents = (agents.data ?? []).filter((a: any) => a.status === "active").length;
  const activeDeployments = (deployments.data ?? []).filter((d: any) => d.status === "active").length;
  const warnings: string[] = [];
  if (activeAgents === 0) warnings.push("No active agents");

  return ok({
    overall: warnings.length > 2 ? "critical" : warnings.length > 0 ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    agents: { active: activeAgents, total: agents.count ?? 0 },
    deployments: { active: activeDeployments, total: deployments.count ?? 0 },
    campaigns: { running: (campaigns.data ?? []).filter((c: any) => c.status === "running").length, total: campaigns.count ?? 0 },
    mockMode: true,
    criticalWarnings: warnings,
  });
});

// ══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUser(req);
    if (!user) return error("UNAUTHORIZED", "Authentication required", 401);

    const url = new URL(req.url);
    // Strip the function prefix to get the route path
    const pathname = url.pathname.replace(/^\/ai-voice-api/, "");

    const match = matchRoute(req.method, pathname);
    if (!match) return error("NOT_FOUND", `Route ${req.method} ${pathname} not found`, 404);

    return await match.handler(req, url, match.params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return error("INTERNAL", msg, 500);
  }
});
