-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Banners do carrossel da homepage

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  alt_text text not null default 'Banner Nativa',
  image_url text not null,
  image_url_mobile text,
  link_url text,
  object_position text not null default 'center center',
  object_position_mobile text not null default 'center 22%',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banners_sort_order_idx
  on public.banners (sort_order asc, created_at asc);

create index if not exists banners_active_idx
  on public.banners (is_active)
  where is_active = true;

alter table public.banners enable row level security;

drop policy if exists "banners_public_read" on public.banners;
create policy "banners_public_read"
  on public.banners
  for select
  to anon, authenticated
  using (is_active = true);

-- Banner atual da loja (fallback visual até o admin adicionar outros)
insert into public.banners (
  title,
  alt_text,
  image_url,
  object_position,
  object_position_mobile,
  sort_order,
  is_active
)
select
  'Banner principal',
  'Nativa — Fauna e flora brasileira',
  '/images/bannerNativa.jpg',
  'center center',
  'center 22%',
  0,
  true
where not exists (
  select 1 from public.banners where image_url = '/images/bannerNativa.jpg'
);
