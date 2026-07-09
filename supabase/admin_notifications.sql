-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Notificações in-app para o painel admin (novos pedidos e clientes)

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_order', 'new_customer')),
  title text not null,
  message text not null,
  entity_type text not null check (entity_type in ('order', 'customer')),
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (read_at)
  where read_at is null;

alter table public.admin_notifications enable row level security;

-- Notificação ao criar pedido
create or replace function public.notify_admin_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_id text;
  v_payment_label text;
begin
  v_short_id := upper(left(new.id::text, 8));

  v_payment_label := case new.payment_method
    when 'pix' then 'Pix'
    when 'credit_card' then 'Cartão de crédito'
    when 'boleto' then 'Boleto'
    else new.payment_method
  end;

  insert into public.admin_notifications (
    type,
    title,
    message,
    entity_type,
    entity_id
  ) values (
    'new_order',
    'Novo pedido #' || v_short_id,
    'Pedido de R$ ' || trim(to_char(new.total_amount, 'FM999999990.00')) ||
      ' via ' || v_payment_label,
    'order',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_new_order on public.orders;
create trigger trg_notify_admin_new_order
after insert on public.orders
for each row execute function public.notify_admin_new_order();

-- Notificação ao criar perfil de cliente
create or replace function public.notify_admin_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := nullif(trim(new.full_name), '');

  insert into public.admin_notifications (
    type,
    title,
    message,
    entity_type,
    entity_id
  ) values (
    'new_customer',
    'Novo cliente cadastrado',
    coalesce(v_name, 'Cliente sem nome') || ' entrou na loja',
    'customer',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_new_customer on public.customer_profiles;
create trigger trg_notify_admin_new_customer
after insert on public.customer_profiles
for each row execute function public.notify_admin_new_customer();
