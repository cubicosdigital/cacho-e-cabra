-- ═══════════════════════════════════════════════════════════════════
-- 016 · Postulaciones ("Trabaja con nosotros")
--
-- Formulario público en /trabajo: cualquiera puede postular sin login
-- (nombre, correo, teléfono y su CV). Se administra desde
-- /admin/postulaciones según el módulo "postulaciones" de permisos.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists postulaciones (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null default '',
  correo      text not null default '',
  telefono    text not null default '',
  cv_url      text not null default '',
  estado      text not null default 'nueva' check (estado in ('nueva', 'contactado', 'descartado')),
  created_at  timestamptz not null default now()
);

create index if not exists postulaciones_created_at_idx on postulaciones (created_at desc);

alter table postulaciones enable row level security;

-- El alta la hace nuestra propia API con la service key (ver app/api/postulaciones),
-- así que no hace falta una política de insert pública aquí.

create policy "postulaciones: ver (permiso)"
  on postulaciones for select
  to authenticated
  using (tiene_permiso('postulaciones', 'r'));

create policy "postulaciones: editar (permiso)"
  on postulaciones for update
  to authenticated
  using (tiene_permiso('postulaciones', 'u'))
  with check (tiene_permiso('postulaciones', 'u'));

create policy "postulaciones: borrar (permiso)"
  on postulaciones for delete
  to authenticated
  using (tiene_permiso('postulaciones', 'd'));
