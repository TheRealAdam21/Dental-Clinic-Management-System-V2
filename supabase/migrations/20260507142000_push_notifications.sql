-- Stores browser push subscriptions per dentist/device.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  dentist_id text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_dentist_id
  on public.push_subscriptions(dentist_id);

-- Track sent notifications so scheduler won't duplicate.
create table if not exists public.notification_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  dentist_id text not null,
  appointment_id text,
  notification_type text not null,
  sent_at timestamptz not null default now(),
  payload jsonb
);

create unique index if not exists idx_notification_dispatch_unique
  on public.notification_dispatch_logs(dentist_id, appointment_id, notification_type);

alter table public.push_subscriptions enable row level security;
alter table public.notification_dispatch_logs enable row level security;

drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
on public.push_subscriptions
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Users can read dispatch logs" on public.notification_dispatch_logs;
create policy "Users can read dispatch logs"
on public.notification_dispatch_logs
for select
to anon, authenticated
using (true);
