-- ════════════════════════════════════════════════════════════════════
-- Fase 3 — asistencia (terminal de huella ZK-K40)
-- ════════════════════════════════════════════════════════════════════

-- ─── empleados: columnas nuevas ────────────────────────────────────
alter table empleados add column if not exists rut text unique;
alter table empleados add column if not exists cargo text;
alter table empleados add column if not exists control_asistencia boolean not null default true;
-- id numérico que se le asigna a la persona al enrolar su huella en el terminal ZK
alter table empleados add column if not exists zk_id integer unique;

-- ─── asistencias ───────────────────────────────────────────────────
create table if not exists asistencias (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references empleados(id) on delete cascade,
  fecha        date not null,
  hora         time not null,
  tipo         text not null check (tipo in ('entrada', 'salida')),
  origen       text, -- nombre del archivo importado, para trazabilidad
  created_at   timestamptz not null default now(),
  unique (empleado_id, fecha, hora, tipo)
);

create index if not exists asistencias_empleado_fecha_idx on asistencias(empleado_id, fecha);

alter table asistencias enable row level security;

create policy "asistencias: lectura staff"
  on asistencias for select
  to authenticated
  using (true);

create policy "asistencias: escritura solo admin"
  on asistencias for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- ─── seed: trabajadores desde "DATOS TRABAJADORES.xlsx" ────────────
insert into empleados (nombre, rut, cargo, departamento, control_asistencia, tipo_contrato)
values
  ('Rosillo Martínez Favianny Del Valle', '28.603.090-4', 'Ayudante de cocina', 'cocina', true, 'full_time'),
  ('Tobar Vargas Julian Alejandro', '20.931.819-9', 'Ayudante de cocina', 'cocina', true, 'full_time'),
  ('Sebastian Troncoso', '19.404.367-8', 'Ayudante de cocina', 'cocina', true, 'full_time'),
  ('Alvarez Farias Diego Ignacio', '17.815.793-0', 'Bartender', 'barra', true, 'full_time'),
  ('Moya Bahamonde Sebastian Exequiel', '20.326.611-1', 'Bartender', 'barra', true, 'full_time'),
  ('Maria De Los Angeles Lopez Granadino', '26082211', 'Copería', 'coperia', true, 'full_time'),
  ('Sierra William Alexander', '27.317.617-9', 'Copero', 'coperia', true, 'full_time'),
  ('Haupt Seguel Allison Maria', '19.974.558-1', 'Encargada de garzones', 'garzones', false, 'full_time'),
  ('Pino Arenas Christian Alejandro Andres', '16.404.237-5', 'Garzón', 'garzones', true, 'full_time'),
  ('Reyes Gonzalez Thomas Maximiliano', '20.569.625-3', 'Garzón', 'garzones', true, 'full_time'),
  ('Vargas Castro Luisa Fernanda', '25.772.716-5', 'Garzona', 'garzones', true, 'full_time'),
  ('Carreño Fuentes Gabriela Alejandra', '19.404.754-1', 'Jefa de cocina', 'cocina', false, 'full_time')
on conflict (rut) do nothing;
