-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Mapa Vivo das Origens — regiões culturais associadas a produtos

create table if not exists public.regions (
  id text primary key,
  name text not null,
  title text not null,
  story text not null,
  cover_image text not null,
  product_ids bigint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.regions enable row level security;

drop policy if exists "regions_public_read" on public.regions;
create policy "regions_public_read"
  on public.regions
  for select
  to anon, authenticated
  using (true);

-- Vínculo opcional: cada produto pode ter uma região de origem
alter table public.products
  add column if not exists region_id text references public.regions(id) on delete set null;

create index if not exists products_region_id_idx
  on public.products (region_id);
