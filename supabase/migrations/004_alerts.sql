create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  statute_id uuid not null references public.statutes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(device_id, statute_id)
);
create index if not exists alerts_device_id_idx on public.alerts(device_id);
create index if not exists alerts_statute_id_idx on public.alerts(statute_id);
