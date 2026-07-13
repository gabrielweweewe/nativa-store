-- Execute no SQL Editor do Supabase depois de orders.sql e admin_notifications.sql.
-- Checkout Transparente Mercado Pago (Orders API).

create table if not exists public.mercado_pago_settings (
  environment text primary key check (environment in ('test', 'production')),
  enabled boolean not null default false,
  public_key text not null default '',
  access_token_encrypted text,
  webhook_secret_encrypted text,
  pix_enabled boolean not null default true,
  boleto_enabled boolean not null default true,
  credit_card_enabled boolean not null default true,
  max_installments int not null default 12 check (max_installments between 1 and 12),
  boleto_expiration_days int not null default 3 check (boleto_expiration_days between 1 and 30),
  updated_at timestamptz not null default now()
);

insert into public.mercado_pago_settings (environment)
values ('test'), ('production')
on conflict (environment) do nothing;

alter table public.mercado_pago_settings enable row level security;

alter table public.orders
  add column if not exists payment_status text not null default 'pending',
  add column if not exists external_reference text,
  add column if not exists mercado_pago_order_id text,
  add column if not exists mercado_pago_payment_id text,
  add column if not exists payment_status_detail text,
  add column if not exists payment_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_instructions jsonb,
  add column if not exists cart_id uuid references public.carts(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in (
        'pending', 'processing', 'approved', 'rejected', 'canceled', 'expired', 'refunded'
      ));
  end if;
end $$;

-- Preserva a leitura dos pedidos simulados criados antes da integração.
update public.orders
set payment_status = 'approved',
    paid_at = coalesce(paid_at, created_at)
where status = 'paid'
  and mercado_pago_order_id is null
  and payment_status = 'pending';

create unique index if not exists orders_external_reference_idx
  on public.orders (external_reference) where external_reference is not null;
create unique index if not exists orders_mercado_pago_order_id_idx
  on public.orders (mercado_pago_order_id) where mercado_pago_order_id is not null;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  idempotency_key uuid not null unique,
  environment text not null check (environment in ('test', 'production')),
  payment_method text not null check (payment_method in ('pix', 'credit_card', 'boleto')),
  mercado_pago_order_id text unique,
  mercado_pago_payment_id text,
  status text not null default 'pending',
  status_detail text,
  request_payload jsonb,
  response_payload jsonb,
  error_payload jsonb,
  accepted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_attempts_order_id_idx on public.payment_attempts (order_id);
alter table public.payment_attempts enable row level security;

create or replace function public.checkout_create_payment_order(
  p_customer_id uuid,
  p_cart_id uuid,
  p_total_amount numeric,
  p_shipping_amount numeric,
  p_coupon_code text,
  p_shipping_address jsonb,
  p_payment_method text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_environment text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart public.carts%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
begin
  select * into v_cart from public.carts
  where id = p_cart_id and customer_id = p_customer_id and status = 'active'
  for update;

  if not found or p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio ou inválido';
  end if;

  insert into public.orders (
    customer_id, status, payment_status, total_amount, shipping_amount,
    coupon_code, shipping_address, payment_method, external_reference, cart_id
  ) values (
    p_customer_id, 'pending', 'pending', p_total_amount, p_shipping_amount,
    p_coupon_code, p_shipping_address, p_payment_method, gen_random_uuid()::text, p_cart_id
  ) returning * into v_order;

  update public.orders set external_reference = v_order.id::text where id = v_order.id
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, product_slug, name, quantity, price, size, color, image
    ) values (
      v_order.id, v_item->>'product_slug', v_item->>'name',
      (v_item->>'quantity')::int, (v_item->>'price')::numeric,
      v_item->>'size', nullif(v_item->>'color', ''), v_item->>'image'
    );
  end loop;

  insert into public.payment_attempts (
    order_id, idempotency_key, environment, payment_method
  ) values (
    v_order.id, p_idempotency_key, p_environment, p_payment_method
  );

  return v_order;
end;
$$;

create or replace function public.checkout_accept_payment(
  p_order_id uuid,
  p_mercado_pago_order_id text,
  p_mercado_pago_payment_id text,
  p_payment_status text,
  p_status_detail text,
  p_expires_at timestamptz,
  p_instructions jsonb,
  p_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  update public.orders set
    mercado_pago_order_id = p_mercado_pago_order_id,
    mercado_pago_payment_id = p_mercado_pago_payment_id,
    payment_status = p_payment_status,
    payment_status_detail = p_status_detail,
    payment_expires_at = p_expires_at,
    payment_instructions = p_instructions
  where id = p_order_id
  returning cart_id into v_cart_id;

  update public.payment_attempts set
    mercado_pago_order_id = p_mercado_pago_order_id,
    mercado_pago_payment_id = p_mercado_pago_payment_id,
    status = p_payment_status,
    status_detail = p_status_detail,
    response_payload = p_response,
    accepted_at = coalesce(accepted_at, now()),
    updated_at = now()
  where order_id = p_order_id;

  if v_cart_id is not null then
    delete from public.cart_items where cart_id = v_cart_id;
    update public.carts set status = 'converted' where id = v_cart_id and status = 'active';
  end if;
end;
$$;

create or replace function public.reconcile_mercado_pago_payment(
  p_mercado_pago_order_id text,
  p_mercado_pago_payment_id text,
  p_payment_status text,
  p_status_detail text,
  p_response jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_first_approval boolean := false;
begin
  select * into v_order from public.orders
  where mercado_pago_order_id = p_mercado_pago_order_id
  for update;

  if not found then return null; end if;
  v_first_approval := p_payment_status = 'approved' and v_order.payment_status <> 'approved';

  update public.orders set
    payment_status = p_payment_status,
    payment_status_detail = p_status_detail,
    mercado_pago_payment_id = coalesce(p_mercado_pago_payment_id, mercado_pago_payment_id),
    status = case
      when p_payment_status = 'approved' then 'paid'
      when p_payment_status in ('canceled', 'expired') then 'canceled'
      else status
    end,
    paid_at = case when v_first_approval then now() else paid_at end
  where id = v_order.id;

  update public.payment_attempts set
    mercado_pago_payment_id = coalesce(p_mercado_pago_payment_id, mercado_pago_payment_id),
    status = p_payment_status,
    status_detail = p_status_detail,
    response_payload = p_response,
    approved_at = case when v_first_approval then now() else approved_at end,
    updated_at = now()
  where order_id = v_order.id;

  if v_first_approval then
    for v_item in
      select product_slug, sum(quantity)::int quantity
      from public.order_items where order_id = v_order.id group by product_slug
    loop
      update public.products
      set stock_count = greatest(0, stock_count - v_item.quantity),
          in_stock = (stock_count - v_item.quantity) > 0
      where slug = v_item.product_slug;
    end loop;
  end if;

  return v_order.id;
end;
$$;

-- A venda só é notificada quando o pagamento muda para aprovado.
drop trigger if exists trg_notify_admin_new_order on public.orders;
create or replace function public.notify_admin_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if new.payment_status = 'approved' and old.payment_status <> 'approved' then
    v_label := case new.payment_method
      when 'pix' then 'Pix'
      when 'credit_card' then 'Cartão de crédito'
      when 'boleto' then 'Boleto'
      else new.payment_method
    end;
    insert into public.admin_notifications (
      type, title, message, entity_type, entity_id
    ) values (
      'new_order', 'Pagamento aprovado #' || upper(left(new.id::text, 8)),
      'Pedido de R$ ' || trim(to_char(new.total_amount, 'FM999999990.00')) ||
        ' via ' || v_label, 'order', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_admin_paid_order on public.orders;
create trigger trg_notify_admin_paid_order
after update of payment_status on public.orders
for each row execute function public.notify_admin_paid_order();
