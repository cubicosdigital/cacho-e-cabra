-- Cacho & Cabra — schema Fase 1 (infra + menú + pedidos + admin)
-- Correr una sola vez en el SQL editor del proyecto Supabase.

create extension if not exists pgcrypto;

-- ─── usuarios_admin ────────────────────────────────────────────────
create table if not exists usuarios_admin (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  nombre     text not null,
  rol        text not null default 'mesero' check (rol in ('admin','mesero','cocina','barra','caja')),
  permisos   jsonb not null default '{}'::jsonb,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table usuarios_admin enable row level security;

create policy "usuarios_admin: leer propio registro"
  on usuarios_admin for select
  to authenticated
  using (email = auth.jwt() ->> 'email');

-- Helper: ¿el usuario autenticado es admin activo?
create or replace function es_admin_activo() returns boolean as $$
  select exists (
    select 1 from usuarios_admin
    where email = auth.jwt() ->> 'email' and rol = 'admin' and activo
  );
$$ language sql stable security definer;

-- ─── productos ─────────────────────────────────────────────────────
create table if not exists productos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text not null default '',
  precio      integer not null,
  categoria   text not null check (categoria in ('chef','cafeteria','brunch','comida','tragos','postres')),
  foto        text not null default '',
  badge       text,
  popular     boolean not null default false,
  disponible  boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table productos enable row level security;

create policy "productos: lectura publica"
  on productos for select
  to anon, authenticated
  using (true);

create policy "productos: escritura solo admin"
  on productos for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── mesas ─────────────────────────────────────────────────────────
create table if not exists mesas (
  id         uuid primary key default gen_random_uuid(),
  numero     integer not null unique,
  capacidad  integer not null default 4,
  zona       text not null default '',
  forma      text not null default 'cuad' check (forma in ('cuad','redonda','barra')),
  x          integer not null default 0,
  y          integer not null default 0,
  w          integer not null default 60,
  h          integer not null default 60,
  created_at timestamptz not null default now()
);

alter table mesas enable row level security;

create policy "mesas: lectura publica"
  on mesas for select
  to anon, authenticated
  using (true);

create policy "mesas: escritura solo admin"
  on mesas for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── pedidos ───────────────────────────────────────────────────────
create table if not exists pedidos (
  id             uuid primary key default gen_random_uuid(),
  mesa_numero    text not null,
  nombre_cliente text not null default '',
  notas          text not null default '',
  estado         text not null default 'recibido' check (estado in ('recibido','preparando','listo','entregado')),
  total          integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table pedidos enable row level security;

create policy "pedidos: crear publico (pedido desde mesa)"
  on pedidos for insert
  to anon, authenticated
  with check (true);

create policy "pedidos: leer y actualizar solo staff"
  on pedidos for select
  to authenticated
  using (true);

create policy "pedidos: actualizar solo staff"
  on pedidos for update
  to authenticated
  using (true)
  with check (true);

-- ─── items_pedido ──────────────────────────────────────────────────
create table if not exists items_pedido (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references pedidos(id) on delete cascade,
  producto_id      uuid references productos(id),
  nombre           text not null,
  categoria        text not null default 'comida',
  cantidad         integer not null,
  precio_unitario  integer not null
);

alter table items_pedido enable row level security;

create policy "items_pedido: crear publico (junto al pedido)"
  on items_pedido for insert
  to anon, authenticated
  with check (true);

create policy "items_pedido: leer solo staff"
  on items_pedido for select
  to authenticated
  using (true);

-- ─── Realtime (panel de cocina/barra) ─────────────────────────────
alter publication supabase_realtime add table pedidos;
alter publication supabase_realtime add table items_pedido;

-- ════════════════════════════════════════════════════════════════════
-- Fase 2 — turnos, tareas, denuncias, reclamos
-- ════════════════════════════════════════════════════════════════════

-- ─── empleados ─────────────────────────────────────────────────────
create table if not exists empleados (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  departamento     text not null check (departamento in ('cocina','barra','garzones','coperia')),
  tipo_contrato    text not null default 'full_time' check (tipo_contrato in ('full_time','part_time')),
  usuario_admin_id uuid references usuarios_admin(id),
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table empleados enable row level security;

create policy "empleados: lectura staff"
  on empleados for select
  to authenticated
  using (true);

create policy "empleados: escritura solo admin"
  on empleados for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- Helpers: identidad del usuario autenticado, para RLS "es lo mío"
-- (van después de empleados porque mi_empleado_id() la referencia)
create or replace function mi_empleado_id() returns uuid as $$
  select e.id from empleados e
  join usuarios_admin u on u.id = e.usuario_admin_id
  where u.email = auth.jwt() ->> 'email'
  limit 1;
$$ language sql stable security definer;

create or replace function mi_rol() returns text as $$
  select rol from usuarios_admin where email = auth.jwt() ->> 'email' limit 1;
$$ language sql stable security definer;

-- ─── turnos ────────────────────────────────────────────────────────
create table if not exists turnos (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references empleados(id) on delete cascade,
  temporada     text not null default 'invierno-2026',
  dia_semana    text not null check (dia_semana in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  hora_entrada  time,
  hora_salida   time,
  horas         numeric not null default 0,
  nota          text,
  created_at    timestamptz not null default now()
);

alter table turnos enable row level security;

create policy "turnos: lectura staff"
  on turnos for select
  to authenticated
  using (true);

create policy "turnos: escritura solo admin"
  on turnos for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── tareas ────────────────────────────────────────────────────────
create table if not exists tareas (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descripcion  text not null default '',
  asignado_a   uuid references empleados(id),
  rol_destino  text check (rol_destino in ('admin','mesero','cocina','barra','caja')),
  estado       text not null default 'pendiente' check (estado in ('pendiente','en_progreso','completada','bloqueada')),
  prioridad    text not null default 'media' check (prioridad in ('baja','media','alta','urgente')),
  creado_por   uuid references usuarios_admin(id),
  fecha_limite date,
  created_at   timestamptz not null default now()
);

alter table tareas enable row level security;

create policy "tareas: lectura staff"
  on tareas for select
  to authenticated
  using (true);

create policy "tareas: escritura solo admin"
  on tareas for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

create policy "tareas: marcar estado de mis propias tareas"
  on tareas for update
  to authenticated
  using (asignado_a = mi_empleado_id() or rol_destino = mi_rol())
  with check (asignado_a = mi_empleado_id() or rol_destino = mi_rol());

-- ─── denuncias (canal interno trabajadores) ───────────────────────
create table if not exists denuncias (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('acoso','seguridad','irregularidad','otro')),
  descripcion        text not null,
  anonima            boolean not null default false,
  nombre_denunciante text,
  empleado_id        uuid references empleados(id),
  estado             text not null default 'nueva' check (estado in ('nueva','en_revision','resuelta')),
  respuesta_admin    text,
  created_at         timestamptz not null default now()
);

alter table denuncias enable row level security;

create policy "denuncias: crear staff logueado"
  on denuncias for insert
  to authenticated
  with check (true);

create policy "denuncias: leer y gestionar solo admin"
  on denuncias for select
  to authenticated
  using (es_admin_activo());

create policy "denuncias: actualizar solo admin"
  on denuncias for update
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── reclamos (canal público clientes) ────────────────────────────
create table if not exists reclamos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  email            text not null,
  telefono         text,
  mensaje          text not null,
  tipo             text not null default 'queja' check (tipo in ('queja','sugerencia','felicitacion')),
  estado           text not null default 'nuevo' check (estado in ('nuevo','en_revision','resuelto')),
  respuesta_admin  text,
  created_at       timestamptz not null default now()
);

alter table reclamos enable row level security;

create policy "reclamos: crear publico"
  on reclamos for insert
  to anon, authenticated
  with check (true);

create policy "reclamos: leer y gestionar solo admin"
  on reclamos for select
  to authenticated
  using (es_admin_activo());

create policy "reclamos: actualizar solo admin"
  on reclamos for update
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());
