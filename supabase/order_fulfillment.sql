-- Execute depois de orders.sql, mercado_pago.sql, melhor_envio_checkout.sql e brevo.sql.
-- Separa o ciclo logístico do estado financeiro do pedido.

alter table public.orders
  add column if not exists fulfillment_status text not null default 'unfulfilled',
  add column if not exists tracking_code text,
  add column if not exists tracking_url text,
  add column if not exists processing_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfillment_status_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_status_check
      check (
        fulfillment_status in (
          'unfulfilled', 'processing', 'shipped', 'delivered', 'canceled'
        )
      );
  end if;
end $$;

create index if not exists orders_fulfillment_status_created_idx
  on public.orders (fulfillment_status, created_at desc);
