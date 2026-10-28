-- ═══════════════════════════════════════════════════════════════════
-- 020 · Gift cards
--
-- Cada gift card tiene un `id` uuid (va en el link público que se envía por
-- WhatsApp, así que no se puede adivinar) y un `codigo` corto y legible que el
-- cliente muestra en caja para canjearla.
--
-- No hay política para `anon`: las páginas públicas (/giftcard/[id]) leen la
-- tabla desde el servidor, nunca desde el navegador.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists giftcards (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  tipo        text not null check (tipo in ('monto', 'porcentaje')),
  -- monto: pesos enteros · porcentaje: 1 a 100
  valor       integer not null check (valor > 0),
  mensaje     text not null default '',
  para        text not null default '',
  telefono    text not null default '',
  vence       date,
  estado      text not null default 'activa' check (estado in ('activa', 'canjeada', 'anulada')),
  creada_por  text not null default '',
  creada_en   timestamptz not null default now(),
  canjeada_en timestamptz,
  constraint giftcards_porcentaje_max check (tipo <> 'porcentaje' or valor <= 100)
);

create index if not exists giftcards_creada_en_idx on giftcards (creada_en desc);

alter table giftcards enable row level security;

drop policy if exists "giftcards: admin" on giftcards;
create policy "giftcards: admin"
  on giftcards for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
