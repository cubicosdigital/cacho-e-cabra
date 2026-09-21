-- ════════════════════════════════════════════════════════════════════
-- Fase 4 — ficha del trabajador, invitaciones por WhatsApp y notificaciones
-- ════════════════════════════════════════════════════════════════════

-- ─── fichas_empleado: datos personales y contractuales (solo admin) ──
create table if not exists fichas_empleado (
  empleado_id  uuid primary key references empleados(id) on delete cascade,

  -- Lo completa el trabajador
  email                text,
  telefono             text,
  direccion            text,
  comuna               text,
  fecha_nacimiento     date,
  nacionalidad         text,
  estado_civil         text,
  emergencia_nombre     text,
  emergencia_parentesco text,
  emergencia_telefono   text,

  -- Opcionales al registrarse
  afp                  text,
  salud_sistema        text check (salud_sistema in ('fonasa', 'isapre')),
  isapre_nombre        text,
  isapre_plan          text,
  seguro_cesantia      boolean,
  cargas               jsonb not null default '[]'::jsonb, -- [{nombre, rut, parentesco}]
  visa_tipo            text,
  visa_vencimiento     date,
  banco                text,
  tipo_cuenta          text,
  numero_cuenta        text,
  manipulador_alimentos       boolean,
  manipulador_vencimiento     date,
  consentimiento       boolean not null default false,
  consentimiento_fecha timestamptz,

  -- Lo completa el admin
  fecha_ingreso            date,
  contrato_duracion        text check (contrato_duracion in ('indefinido', 'plazo_fijo', 'por_obra')),
  fecha_termino            date,
  jornada_horas_semanales  numeric,
  sueldo_base              integer,

  registrado_at timestamptz, -- cuándo el trabajador envió su ficha
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table fichas_empleado enable row level security;

create policy "fichas: solo admin"
  on fichas_empleado for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── invitaciones: link único que se manda por WhatsApp ────────────
create table if not exists invitaciones (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references empleados(id) on delete cascade,
  token        text not null unique,
  telefono     text,
  expira_en    timestamptz not null,
  usada_en     timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists invitaciones_empleado_idx on invitaciones(empleado_id);

alter table invitaciones enable row level security;

create policy "invitaciones: solo admin"
  on invitaciones for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── notificaciones para el admin ──────────────────────────────────
create table if not exists notificaciones (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null,
  titulo       text not null,
  mensaje      text,
  empleado_id  uuid references empleados(id) on delete cascade,
  leida        boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notificaciones_leida_idx on notificaciones(leida, created_at desc);

alter table notificaciones enable row level security;

create policy "notificaciones: solo admin"
  on notificaciones for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
