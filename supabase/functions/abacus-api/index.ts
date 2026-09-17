// Abacus (Abacus Research AG) integration endpoint
// Actions: status (which credentials are present), test (OAuth token + optional probe), request (generic REST proxy)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function trimSlash(v: string) {
  return v.replace(/\/+$/, "");
}

async function getToken(baseUrl: string, clientId: string, clientSecret: string) {
  const tokenUrl = `${trimSlash(baseUrl)}/oauth/oauth2/v1/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${text.slice(0, 500)}`);
  }
  let parsed: { access_token?: string; expires_in?: number };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Unerwartete Antwort von Abacus: ${text.slice(0, 300)}`);
  }
  if (!parsed.access_token) throw new Error("Abacus hat kein access_token zurückgegeben.");
  return parsed as { access_token: string; expires_in?: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const baseUrl = Deno.env.get("ABACUS_BASE_URL") ?? "";
  const clientId = Deno.env.get("ABACUS_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("ABACUS_CLIENT_SECRET") ?? "";
  const mandant = Deno.env.get("ABACUS_MANDANT") ?? "";

  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    body = {};
  }
  const action = (body.action as string) ?? "status";

  const configured = Boolean(baseUrl && clientId && clientSecret);

  if (action === "status") {
    return json({
      configured,
      baseUrl: baseUrl ? trimSlash(baseUrl) : null,
      mandant: mandant || null,
      missing: [
        !baseUrl && "ABACUS_BASE_URL",
        !clientId && "ABACUS_CLIENT_ID",
        !clientSecret && "ABACUS_CLIENT_SECRET",
      ].filter(Boolean),
      clientPreview: clientId ? `${clientId.slice(0, 4)}••••${clientId.slice(-2)}` : null,
    });
  }

  if (!configured) {
    return json({ error: "Abacus ist nicht konfiguriert." }, 400);
  }

  if (action === "test") {
    try {
      const token = await getToken(baseUrl, clientId, clientSecret);
      let probe: { status: number; ok: boolean; body?: string } | null = null;
      const mandantId = (body.mandant as string) || mandant;
      if (mandantId) {
        const url = `${trimSlash(baseUrl)}/api/entity/v1/mandants/${mandantId}/AddressData?$top=1`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
        });
        const text = await res.text();
        probe = { status: res.status, ok: res.ok, body: text.slice(0, 400) };
      }
      return json({ ok: true, expires_in: token.expires_in ?? null, probe });
    } catch (e) {
      return json({ error: `Verbindung fehlgeschlagen: ${(e as Error).message}` }, 400);
    }
  }

  if (action === "request") {
    const path = (body.path as string) || "";
    if (!path.startsWith("/")) {
      return json({ error: "path muss mit '/' beginnen." }, 400);
    }
    const method = ((body.method as string) || "GET").toUpperCase();
    try {
      const token = await getToken(baseUrl, clientId, clientSecret);
      const res = await fetch(`${trimSlash(baseUrl)}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
          ...(body.body ? { "Content-Type": "application/json" } : {}),
          ...((body.headers as Record<string, string>) ?? {}),
        },
        body: body.body ? JSON.stringify(body.body) : undefined,
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Abacus request failed [${res.status}]: ${text}`);
        return json({ error: "Abacus-Anfrage fehlgeschlagen", status: res.status, details: text }, res.status);
      }
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch { /* keep raw text */ }
      return json({ ok: true, status: res.status, data });
    } catch (e) {
      return json({ error: `Abacus-Anfrage fehlgeschlagen: ${(e as Error).message}` }, 500);
    }
  }

  return json({ error: `Unbekannte Aktion: ${action}` }, 400);
});
