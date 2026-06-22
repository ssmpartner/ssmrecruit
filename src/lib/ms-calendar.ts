import { supabase } from '@/integrations/supabase/client';

export interface ScheduleItem {
  status: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

export interface ScheduleResult {
  scheduleId: string;
  availabilityView: string;
  scheduleItems: ScheduleItem[];
}

export interface FreeSlot {
  start: Date;
  end: Date;
}

/**
 * Fragt Microsoft 365 Verfügbarkeiten ab (Free/Busy only, keine Termininhalte).
 */
export async function fetchAvailability(params: {
  emails: string[];
  start: Date;
  end: Date;
  intervalMinutes?: number;
}): Promise<ScheduleResult[]> {
  const { data, error } = await supabase.functions.invoke('ms-calendar-availability', {
    body: {
      schedules: params.emails,
      startISO: params.start.toISOString().slice(0, 19),
      endISO: params.end.toISOString().slice(0, 19),
      intervalMinutes: params.intervalMinutes ?? 30,
    },
  });
  if (error) throw error;
  return (data as any)?.schedules ?? [];
}

/**
 * Ermittelt freie Slots innerhalb der Arbeitszeit (Mo–Fr 08:00–18:00 Europe/Zurich)
 * unter Berücksichtigung von 15 min Puffer vor und nach belegten Terminen.
 */
export function computeFreeSlots(
  schedule: ScheduleResult,
  opts: { from: Date; to: Date; durationMinutes: number; bufferMinutes?: number },
): FreeSlot[] {
  const buffer = (opts.bufferMinutes ?? 15) * 60_000;
  const duration = opts.durationMinutes * 60_000;

  const busy = schedule.scheduleItems
    .filter((it) => it.status !== 'free')
    .map((it) => ({
      start: new Date(it.start.dateTime).getTime() - buffer,
      end: new Date(it.end.dateTime).getTime() + buffer,
    }))
    .sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  const cursor = new Date(opts.from);

  while (cursor < opts.to) {
    const dow = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(8, 0, 0, 0);
      continue;
    }
    const dayStart = new Date(cursor);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(18, 0, 0, 0);

    let t = Math.max(cursor.getTime(), dayStart.getTime());
    while (t + duration <= dayEnd.getTime()) {
      const slotEnd = t + duration;
      const conflict = busy.find((b) => b.start < slotEnd && b.end > t);
      if (conflict) {
        t = conflict.end;
      } else {
        slots.push({ start: new Date(t), end: new Date(slotEnd) });
        t += duration;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(8, 0, 0, 0);
  }

  return slots;
}

export async function getMyMsConnection() {
  const { data } = await supabase
    .from('microsoft_calendar_connections')
    .select('email, tenant_id, connected_at, last_sync_at, active, scopes')
    .maybeSingle();
  return data;
}
