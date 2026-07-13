-- Execute depois de setup.sql, cart.sql, orders.sql, mercado_pago.sql e melhor_envio.sql.
-- Cotação persistida, frete no checkout e carrinho de etiquetas do Melhor Envio.

alter table public.products
  add column if not exists width_cm numeric(8, 2),
  add column if not exists height_cm numeric(8, 2),
  add column if not exists length_cm numeric(8, 2),
  add column if not exists weight_kg numeric(8, 3);

alter table public.melhor_envio_settings
  add column if not exists sender_name text not null default '',
  add column if not exists sender_email text not null default '',
  add column if not exists sender_phone text not null default '',
  add column if not exists sender_document_type text not null default 'cpf',
  add column if not exists sender_document text not null default '',
  add column if not exists sender_state_register text not null default 'ISENTO',
  add column if not exists sender_address text not null default '',
  add column if not exists sender_number text not null default '',
  add column if not exists sender_complement text not null default '',
  add column if not exists sender_district text not null default '',
  add column if not exists sender_city text not null default '',
  add column if not exists sender_state_abbr text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'melhor_envio_sender_document_type_check'
  ) then
    alter table public.melhor_envio_settings
      add constraint melhor_envio_sender_document_type_check
      check (sender_document_type in ('cpf', 'cnpj'));
  end if;
end $$;

create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  cart_id uuid references public.carts(id) on delete cascade,
  environment text not null check (environment in ('production', 'sandbox')),
  from_postal_code text not null,
  to_postal_code text not null,
  subtotal numeric(10, 2) not null,
  free_shipping_applied boolean not null default false,
  request_payload jsonb not null,
  response_payload jsonb not null,
  options jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists shipping_quotes_customer_created_idx
  on public.shipping_quotes (customer_id, created_at desc);
create index if not exists shipping_quotes_cart_created_idx
  on public.shipping_quotes (cart_id, created_at desc);
alter table public.shipping_quotes enable row level security;

alter table public.orders
  add column if not exists shipping_quote_id uuid references public.shipping_quotes(id) on delete set null,
  add column if not exists shipping_service_id text,
  add column if not exists shipping_service_name text,
  add column if not exists shipping_company text,
  add column if not exists shipping_delivery_days int,
  add column if not exists shipping_environment text,
  add column if not exists shipping_quote_snapshot jsonb,
  add column if not exists shipping_recipient jsonb;

create table if not exists public.melhor_envio_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  volume_index int not null default 0 check (volume_index >= 0),
  environment text not null check (environment in ('production', 'sandbox')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'in_cart', 'failed')),
  melhor_envio_cart_id text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  attempt_count int not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, volume_index)
);

create unique index if not exists melhor_envio_shipments_cart_id_idx
  on public.melhor_envio_shipments (melhor_envio_cart_id)
  where melhor_envio_cart_id is not null;
alter table public.melhor_envio_shipments enable row level security;

-- Substitui a versão do checkout criada em mercado_pago.sql para congelar o
-- frete validado no mesmo momento em que o pedido e a tentativa são criados.
drop function if exists public.checkout_create_payment_order(
  uuid, uuid, numeric, numeric, text, jsonb, text, jsonb, uuid, text
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
  p_shipping_recipient jsonb
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
    coupon_code, shipping_address, payment_method, external_reference, cart_id,
    shipping_quote_id, shipping_service_id, shipping_service_name,
    shipping_company, shipping_delivery_days, shipping_environment,
    shipping_quote_snapshot, shipping_recipient
  ) values (
    p_customer_id, 'pending', 'pending', p_total_amount, p_shipping_amount,
    p_coupon_code, p_shipping_address, p_payment_method, gen_random_uuid()::text, p_cart_id,
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
