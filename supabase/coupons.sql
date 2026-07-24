-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Cupons da loja + desconto no pedido + RPC de checkout atualizada
-- Rode depois de orders.sql, mercado_pago.sql e melhor_envio_checkout.sql

-- ---------------------------------------------------------------------------
-- Tabela de cupons (acesso só via service role no Express)
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null
    check (type in ('percentage', 'fixed', 'free_shipping')),
  value numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  min_subtotal numeric(10, 2)
    check (min_subtotal is null or min_subtotal >= 0),
  max_uses int
    check (max_uses is null or max_uses > 0),
  max_uses_per_customer int
    check (max_uses_per_customer is null or max_uses_per_customer > 0),
  usage_count int not null default 0
    check (usage_count >= 0),
  description text,
  is_map_reward boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_value_by_type_check check (
    (type = 'percentage' and value > 0 and value <= 100)
    or (type = 'fixed' and value >= 0)
    or (type = 'free_shipping' and value >= 0)
  )
);

create unique index if not exists coupons_code_lower_idx
  on public.coupons (lower(code));

create unique index if not exists coupons_one_map_reward_idx
  on public.coupons (is_map_reward)
  where is_map_reward = true;

create index if not exists coupons_active_idx
  on public.coupons (is_active)
  where is_active = true;

alter table public.coupons enable row level security;

-- ---------------------------------------------------------------------------
-- Pedidos: valor de desconto dos itens
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists discount_amount numeric(10, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_discount_amount_check'
  ) then
    alter table public.orders
      add constraint orders_discount_amount_check
      check (discount_amount >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: NATIVA10 (10%) e BRINDE (recompensa do mapa)
-- ---------------------------------------------------------------------------
insert into public.coupons (code, type, value, is_active, description)
select 'NATIVA10', 'percentage', 10, true, '10% de desconto no subtotal'
where not exists (
  select 1 from public.coupons where lower(code) = lower('NATIVA10')
);

insert into public.coupons (code, type, value, is_active, description, is_map_reward)
select 'BRINDE', 'fixed', 0, true, 'Brinde exclusivo junto com a compra. Válido enquanto durarem os estoques.', true
where not exists (
  select 1 from public.coupons where lower(code) = lower('BRINDE')
);

-- ---------------------------------------------------------------------------
-- RPC de checkout com discount_amount
-- Assinatura nova (substitui a de melhor_envio_checkout.sql)
-- ---------------------------------------------------------------------------
drop function if exists public.checkout_create_payment_order(
  uuid, uuid, numeric, numeric, text, jsonb, text, jsonb, uuid, text,
  uuid, text, text, text, int, text, jsonb, jsonb
);

drop function if exists public.checkout_create_payment_order(
  uuid, uuid, numeric, numeric, text, jsonb, text, jsonb, uuid, text,
  uuid, text, text, text, int, text, jsonb, jsonb, numeric
);

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
  p_environment text,
  p_shipping_quote_id uuid,
  p_shipping_service_id text,
  p_shipping_service_name text,
  p_shipping_company text,
  p_shipping_delivery_days int,
  p_shipping_environment text,
  p_shipping_quote_snapshot jsonb,
  p_shipping_recipient jsonb,
  p_discount_amount numeric default 0
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

  if not exists (
    select 1 from public.shipping_quotes
    where id = p_shipping_quote_id
      and customer_id = p_customer_id
      and cart_id = p_cart_id
      and expires_at > now()
  ) then
    raise exception 'Cotação de frete inválida ou expirada';
  end if;

  insert into public.orders (
    customer_id, status, payment_status, total_amount, shipping_amount,
    discount_amount, coupon_code, shipping_address, payment_method,
    external_reference, cart_id,
    shipping_quote_id, shipping_service_id, shipping_service_name,
    shipping_company, shipping_delivery_days, shipping_environment,
    shipping_quote_snapshot, shipping_recipient
  ) values (
    p_customer_id, 'pending', 'pending', p_total_amount, p_shipping_amount,
    coalesce(p_discount_amount, 0), p_coupon_code, p_shipping_address,
    p_payment_method, gen_random_uuid()::text, p_cart_id,
    p_shipping_quote_id, p_shipping_service_id, p_shipping_service_name,
    p_shipping_company, p_shipping_delivery_days, p_shipping_environment,
    p_shipping_quote_snapshot, p_shipping_recipient
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
