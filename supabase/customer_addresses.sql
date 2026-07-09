-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Endereços salvos dos clientes

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  cep text not null,
  rua text not null,
  numero text not null default '',
  complemento text,
  bairro text not null,
  cidade text not null,
  estado text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_customer_addresses_updated_at on public.customer_addresses;
create trigger trg_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

create index if not exists customer_addresses_customer_id_idx
  on public.customer_addresses (customer_id);

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses (customer_id)
  where is_default = true;

alter table public.customer_addresses enable row level security;
