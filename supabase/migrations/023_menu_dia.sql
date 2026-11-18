-- ═══════════════════════════════════════════════════════════════════
-- 023 · Menú del día
--
-- Un menú por fecha. Los platos van dentro de la misma fila (jsonb): así guardar
-- un menú es una sola operación y nunca queda a medias.
--
--   platos = [{ "nombre": "...", "descripcion": "...", "precio": 8900 | null, "foto": "..." }, ...]
--
-- Solo se muestran en la web los menús con publicado = true. No hay política para
-- `anon`: la página pública lee desde el servidor, nunca desde el navegador.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists menu_dias (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null unique,
  hora_desde     text not null default '13:00',
  nota           text not null default '',
  publicado      boolean not null default false,
  platos         jsonb not null default '[]'::jsonb,
  creado_por     text not null default '',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint menu_dias_platos_es_lista check (jsonb_typeof(platos) = 'array')
);

create index if not exists menu_dias_fecha_idx on menu_dias (fecha desc);

alter table menu_dias enable row level security;

drop policy if exists "menu_dias: admin" on menu_dias;
create policy "menu_dias: admin"
  on menu_dias for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
