-- Execute no SQL Editor do Supabase.
-- Configuração do feed de catálogo Meta (Instagram / Facebook Shopping).
-- Acesso apenas via service role no backend (sem policies públicas).

create table if not exists public.meta_catalog_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  feed_token text,
  last_generated_at timestamptz,
  product_count int not null default 0,
  excluded_count int not null default 0,
  default_brand text not null default 'Nativa',
  google_product_category text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.meta_catalog_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.meta_catalog_settings enable row level security;
