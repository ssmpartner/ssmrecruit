// LiveKit integration endpoint: status check + access token minting
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LIVEKIT_API_KEY") ?? "";
  const apiSecret = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
  const wsUrl = Deno.env.get("LIVEKIT_URL") ?? "";

  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch {
    body = {};
  }
  const action = (body.action as string) ?? "status";

  const configured = Boolean(apiKey && apiSecret && wsUrl);

  if (action === "status") {
    return json({
      configured,
      url: wsUrl || null,
      missing: [
        !apiKey && "LIVEKIT_API_KEY",
        !apiSecret && "LIVEKIT_API_SECRET",
        !wsUrl && "LIVEKIT_URL",
      ].filter(Boolean),
      keyPreview: apiKey ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-2)}` : null,
    });
  }

  if (!configured) {
    return json({ error: "LiveKit ist nicht konfiguriert." }, 400);
  }

  if (action === "token") {
    const room = (body.room as string) || "";
    const identity = (body.identity as string) || "";
    if (!room || !identity) {
      return json({ error: "room und identity sind erforderlich." }, 400);
    }
    const name = (body.name as string) || identity;
    const ttlSeconds = Number(body.ttlSeconds ?? 3600);

    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(apiSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const token = await create(
        { alg: "HS256", typ: "JWT" },
        {
          iss: apiKey,
          sub: identity,
          name,
          nbf: getNumericDate(0),
          exp: getNumericDate(ttlSeconds),
          video: {
            room,
            roomJoin: true,
            canPublish: body.canPublish !== false,
            canSubscribe: body.canSubscribe !== false,
            canPublishData: true,
          },
        },
        key,
      );
      return json({ token, url: wsUrl, room, identity });
    } catch (e) {
      return json({ error: `Token konnte nicht erstellt werden: ${(e as Error).message}` }, 500);
    }
  }

  return json({ error: `Unbekannte Aktion: ${action}` }, 400);
});
