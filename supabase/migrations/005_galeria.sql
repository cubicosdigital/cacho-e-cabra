-- ═══════════════════════════════════════════════════════════════════
-- 005 · Galería (videos de YouTube + fotografías)
--
-- Se administra desde /admin/galeria y se muestra en /galeria. Cada
-- ítem es un video o una imagen, agrupado por categoría libre
-- (ej: "Aniversario", "Carta") para poder armar secciones en la página
-- pública sin tener que tocar código cada vez.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists galeria_items (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('video','imagen')),
  categoria   text not null default 'General',
  titulo      text not null default '',
  descripcion text not null default '',
  -- Video: URL o ID de YouTube. Imagen: ruta /uploads/... o ID de Unsplash.
  url         text not null default '',
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists galeria_items_tipo_categoria_orden_idx
  on galeria_items (tipo, categoria, orden);

alter table galeria_items enable row level security;

create policy "galeria: leer activos"
  on galeria_items for select
  to anon, authenticated
  using (activo);

create policy "galeria: admin lee todo"
  on galeria_items for select
  to authenticated
  using (es_admin_activo());

create policy "galeria: admin escribe"
  on galeria_items for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
