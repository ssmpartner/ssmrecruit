
-- 1) Microsoft Calendar Connections
CREATE TABLE public.microsoft_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  microsoft_user_id text NOT NULL,
  tenant_id text NOT NULL,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.microsoft_calendar_connections TO authenticated;
GRANT ALL ON public.microsoft_calendar_connections TO service_role;

ALTER TABLE public.microsoft_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own ms calendar connection"
  ON public.microsoft_calendar_connections
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_ms_calendar_connections_updated_at
  BEFORE UPDATE ON public.microsoft_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Interview <-> Outlook Event Mapping (Phase 2 vorbereitet)
CREATE TABLE public.interview_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microsoft_event_id text NOT NULL,
  calendar_id text,
  meeting_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_calendar_events TO authenticated;
GRANT ALL ON public.interview_calendar_events TO service_role;

ALTER TABLE public.interview_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read interview events"
  ON public.interview_calendar_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "organizer manages own interview events"
  ON public.interview_calendar_events
  FOR ALL
  TO authenticated
  USING (
    organizer_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_interview_calendar_events_updated_at
  BEFORE UPDATE ON public.interview_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
