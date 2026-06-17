
-- pg_net für ausgehende HTTP-Calls aus Triggern
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _service_key text;
  _url text := 'https://adettewqzanmkgnnjlop.supabase.co/functions/v1/notify-new-lead';
begin
  -- Test-Lead nicht benachrichtigen
  if new.id = 'test-lead-dummy-001' then
    return new;
  end if;

  select decrypted_secret into _service_key
  from vault.decrypted_secrets
  where name = 'email_queue_service_role_key'
  limit 1;

  if _service_key is null then
    raise warning 'notify_new_lead: service role key vault secret missing';
    return new;
  end if;

  perform net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object('lead_id', new.id)
  );

  return new;
exception when others then
  raise warning 'notify_new_lead failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_lead on public.leads;
create trigger trg_notify_new_lead
after insert on public.leads
for each row execute function public.notify_new_lead();
