-- Execute no SQL Editor após coupons.sql
-- Marca qual cupom é a recompensa do Mapa das Origens (passaporte)

alter table public.coupons
  add column if not exists is_map_reward boolean not null default false;

-- Apenas um cupom pode ser a recompensa do mapa
create unique index if not exists coupons_one_map_reward_idx
  on public.coupons (is_map_reward)
  where is_map_reward = true;

-- Seed legado: se BORDADO5 ainda existir e ninguém estiver marcado, marca ele
update public.coupons
set is_map_reward = true
where lower(code) = lower('BORDADO5')
  and not exists (
    select 1 from public.coupons where is_map_reward = true
  );

-- Se o código foi renomeado (ex.: BRASIL) e ainda não há recompensa do mapa,
-- marca o único cupom ativo de frete grátis (se houver só um).
update public.coupons c
set is_map_reward = true
where c.id = (
  select id
  from public.coupons
  where is_active = true
    and type = 'free_shipping'
  order by created_at asc
  limit 1
)
and not exists (
  select 1 from public.coupons where is_map_reward = true
)
and (
  select count(*)::int
  from public.coupons
  where is_active = true and type = 'free_shipping'
) = 1;
