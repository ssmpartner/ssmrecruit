import { supabase } from '@/integrations/supabase/client';

export type ZapierEvent = 'lead_created' | 'status_changed' | 'lead_hired';

export interface ZapierConfig {
  enabled?: boolean;
  hooks?: Partial<Record<ZapierEvent, string>>;
}

export const ZAPIER_EVENTS: { key: ZapierEvent; label: string; description: string }[] = [
  { key: 'lead_created', label: 'Neuer Kandidat', description: 'Wird ausgelöst, sobald ein Kandidat erfasst wird.' },
  { key: 'status_changed', label: 'Status geändert', description: 'Wird ausgelöst bei jedem Statuswechsel eines Kandidaten.' },
  { key: 'lead_hired', label: 'Kandidat eingestellt', description: 'Wird ausgelöst, wenn ein Kandidat den Status «Eingestellt» erhält.' },
];

let cache: { value: ZapierConfig; at: number } | null = null;

export async function loadZapierConfig(force = false): Promise<ZapierConfig> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.value;
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'zapier_config').maybeSingle();
  const value = ((data?.value as ZapierConfig | null) ?? {}) as ZapierConfig;
  cache = { value, at: Date.now() };
  return value;
}

export function clearZapierCache() {
  cache = null;
}

/** Sends a payload to the configured Zapier webhook for an event. Fire-and-forget. */
export async function triggerZapier(event: ZapierEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    const cfg = await loadZapierConfig();
    if (!cfg.enabled) return;
    const url = cfg.hooks?.[event];
    if (!url) return;
    await sendToZapier(url, { event, ...payload });
  } catch {
    // Zapier is optional – never block the app
  }
}

export async function sendToZapier(url: string, body: Record<string, unknown>): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'no-cors',
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      triggered_from: window.location.origin,
      source: 'SSM Recruit',
      ...body,
    }),
  });
}
