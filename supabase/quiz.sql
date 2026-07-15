-- Execute no SQL Editor do Supabase
-- Quiz de Curadoria + style_tags em products

-- ---------------------------------------------------------------------------
-- Produtos: tags de estilo para vincular a perfis do quiz
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists style_tags jsonb not null default '[]';

-- ---------------------------------------------------------------------------
-- Perguntas do quiz
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  id text primary key,
  "order" int not null,
  text text not null,
  options jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quiz_questions_order_idx
  on public.quiz_questions ("order");

alter table public.quiz_questions enable row level security;

-- ---------------------------------------------------------------------------
-- Perfis de resultado do quiz
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_results (
  id text primary key,
  name text not null,
  description text not null,
  tags jsonb not null default '[]',
  recommended_product_ids jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quiz_results enable row level security;
