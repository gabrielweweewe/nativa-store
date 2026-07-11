-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Configuração e tokens OAuth do Melhor Envio (produção + sandbox)

create table if not exists public.melhor_envio_settings (
  id text primary key default 'default' check (id = 'default'),

  -- Ambiente ativo: produção (padrão) ou sandbox (testes)
  environment text not null default 'production'
    check (environment in ('production', 'sandbox')),

  -- Credenciais do app em produção
  production_client_id text not null default '',
  production_client_secret text not null default '',
  production_access_token text,
  production_refresh_token text,
  production_token_expires_at timestamptz,

  -- Credenciais do app em sandbox (conta/app separados)
  sandbox_client_id text not null default '',
  sandbox_client_secret text not null default '',
  sandbox_access_token text,
  sandbox_refresh_token text,
  sandbox_token_expires_at timestamptz,

  -- URL de callback cadastrada no app Melhor Envio (deve ser idêntica)
  redirect_uri text not null default '',

  -- User-Agent obrigatório: "NomeApp (email@contato.com)"
  user_agent text not null default 'Nativa Store (contato@nativa.art.br)',

  -- CEP de origem da loja (apenas dígitos)
  origin_postal_code text not null default '',

  -- Dimensões/peso padrão quando o produto não tiver (cm / kg)
  default_width_cm numeric(8, 2) not null default 20,
  default_height_cm numeric(8, 2) not null default 15,
  default_length_cm numeric(8, 2) not null default 10,
  default_weight_kg numeric(8, 3) not null default 0.5,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.melhor_envio_settings enable row level security;

-- Sem políticas públicas: acesso apenas via service role no backend

insert into public.melhor_envio_settings (id)
values ('default')
on conflict (id) do nothing;
