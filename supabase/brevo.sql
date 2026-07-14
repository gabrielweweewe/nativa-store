-- Execute manualmente no SQL Editor do Supabase.
-- Persistência da integração Brevo. Não concede acesso direto às tabelas.

create table if not exists public.brevo_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  api_key_encrypted text,
  webhook_token_encrypted text,
  default_sender_id bigint check (default_sender_id is null or default_sender_id > 0),
  default_sender_email text not null default '',
  default_sender_name text not null default '',
  reply_to text not null default '',
  default_list_id bigint check (default_list_id is null or default_list_id > 0),
  template_order_received bigint,
  template_payment_approved bigint,
  template_payment_failed bigint,
  template_payment_refunded bigint,
  template_order_processing bigint,
  template_order_shipped bigint,
  template_order_delivered bigint,
  account_email text,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.brevo_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.marketing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and length(email) <= 320),
  name text,
  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed')),
  source text not null default 'newsletter',
  consent_ip inet,
  consent_user_agent text,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  brevo_contact_id text,
  brevo_list_ids bigint[] not null default '{}',
  sync_status text not null default 'pending'
    check (sync_status in ('pending', 'synced', 'failed')),
  sync_error text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_subscriptions_email_idx
  on public.marketing_subscriptions (email);
create index if not exists marketing_subscriptions_status_idx
  on public.marketing_subscriptions (status, created_at desc);
create index if not exists marketing_subscriptions_sync_idx
  on public.marketing_subscriptions (sync_status, updated_at)
  where sync_status <> 'synced';

create table if not exists public.brevo_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  event text,
  idempotency_key text unique,
  kind text not null check (kind in ('transactional', 'campaign', 'test')),
  message_id text,
  campaign_id bigint,
  recipient_email text,
  template_id bigint,
  status text not null default 'queued',
  subject text,
  error_message text,
  attempt_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brevo_email_deliveries_message_recipient_idx
  on public.brevo_email_deliveries (message_id, coalesce(recipient_email, ''))
  where message_id is not null;
create index if not exists brevo_email_deliveries_campaign_idx
  on public.brevo_email_deliveries (campaign_id, created_at desc)
  where campaign_id is not null;
create index if not exists brevo_email_deliveries_status_idx
  on public.brevo_email_deliveries (status, created_at desc);
create index if not exists brevo_email_deliveries_order_idx
  on public.brevo_email_deliveries (order_id, created_at desc)
  where order_id is not null;

create table if not exists public.brevo_email_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  message_id text,
  campaign_id bigint,
  email text,
  event_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists brevo_email_events_message_idx
  on public.brevo_email_events (message_id, event_at desc)
  where message_id is not null;
create index if not exists brevo_email_events_campaign_idx
  on public.brevo_email_events (campaign_id, event_at desc)
  where campaign_id is not null;
create index if not exists brevo_email_events_email_idx
  on public.brevo_email_events (lower(email), event_at desc)
  where email is not null;

alter table public.brevo_settings enable row level security;
alter table public.marketing_subscriptions enable row level security;
alter table public.brevo_email_deliveries enable row level security;
alter table public.brevo_email_events enable row level security;

-- Sem policies de anon/authenticated: somente o backend com service role acessa.
revoke all on table public.brevo_settings from anon, authenticated;
revoke all on table public.marketing_subscriptions from anon, authenticated;
revoke all on table public.brevo_email_deliveries from anon, authenticated;
revoke all on table public.brevo_email_events from anon, authenticated;
