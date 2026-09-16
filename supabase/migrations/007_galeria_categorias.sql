-- ═══════════════════════════════════════════════════════════════════
-- 007 · Categorías de la galería
--
-- Antes la categoría de cada foto/video era texto libre. Ahora se
-- administran desde /admin/galeria/categorias (crear, renombrar,
-- reordenar, ocultar) y en /admin/galeria se eligen con un <select> en
-- vez de escribirlas a mano, para evitar categorías duplicadas por
-- error de tipeo ("Aniversario" vs "aniversario").
--
-- Deja creadas "Aniversario" y "Carta" para partir.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists galeria_categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into galeria_categorias (nombre, orden)
values ('Aniversario', 0), ('Carta', 1)
on conflict (nombre) do nothing;

alter table galeria_categorias enable row level security;

create policy "galeria_categorias: leer activas"
  on galeria_categorias for select
  to anon, authenticated
  using (activo);

create policy "galeria_categorias: admin lee todo"
  on galeria_categorias for select
  to authenticated
  using (es_admin_activo());

create policy "galeria_categorias: admin escribe"
  on galeria_categorias for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
