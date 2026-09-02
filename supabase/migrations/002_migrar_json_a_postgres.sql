-- ═══════════════════════════════════════════════════════════════════
-- 002 · Migrar a Postgres los módulos que hoy viven en data/*.json
--
-- Reemplaza el almacenamiento en archivos de: eventos, presupuestos,
-- banner y delivery. Además crea `clientes` (que el código ya usa pero
-- nunca se declaró) y completa `evento_registros`, a la que le faltaban
-- la columna `pagado` y la política de borrado.
--
-- Correr en el SQL Editor de Supabase DESPUÉS de schema.sql.
-- ═══════════════════════════════════════════════════════════════════


-- ─── eventos ───────────────────────────────────────────────────────
-- El id es `text` a propósito: conserva los ids actuales ("1".."9") de
-- data/eventos.json y calza con evento_registros.evento_id, que ya es text.
create table if not exists eventos (
  id           text primary key,
  titulo       text not null,
  tipo         text not null default 'fiesta'
               check (tipo in ('cocina','cena','fiesta','aniversario','privado')),
  fecha        text not null default '',
  fecha_corta  text not null default '',
  mes          text not null default '',
  hora         text not null default '20:00',
  duracion     text not null default '',
  precio       integer not null default 0,
  cupos        integer not null default 0,
  registrados  integer not null default 0,
  emoji        text not null default '🎉',
  subtitulo    text not null default '',
  descripcion  text not null default '',
  detalles     text[] not null default '{}',
  imagen       text not null default '',
  estado       text not null default 'abierto'
               check (estado in ('abierto','privado','invitacion')),
  destacado    boolean not null default false,
  publicado    boolean not null default false,
  orden        integer not null default 0,
  chef         text,
  promo        jsonb,          -- { texto, precio }
  lugar        text,
  gastronomia  text,
  experiencia  text,
  created_at   timestamptz not null default now()
);

create index if not exists eventos_publicado_orden_idx
  on eventos (publicado, orden);

alter table eventos enable row level security;

-- El sitio público solo ve los eventos publicados.
create policy "eventos: leer publicados"
  on eventos for select
  to anon, authenticated
  using (publicado);

create policy "eventos: admin lee todo"
  on eventos for select
  to authenticated
  using (es_admin_activo());

create policy "eventos: admin escribe"
  on eventos for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());


-- ─── evento_registros ──────────────────────────────────────────────
-- Está declarada en schema.sql pero nunca se aplicó al proyecto, así que
-- la creamos acá. Incluye `pagado`, que lib/registros.ts ya usa y que la
-- definición original no contemplaba.
create table if not exists evento_registros (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  email          text not null,
  telefono       text not null,
  personas       integer not null default 1,
  evento_id      text not null,
  fecha_registro timestamptz not null default now(),
  confirmado     boolean not null default false,
  pagado         boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Por si la tabla ya existía sin la columna.
alter table evento_registros
  add column if not exists pagado boolean not null default false;

alter table evento_registros enable row level security;

drop policy if exists "evento_registros: crear publico" on evento_registros;
create policy "evento_registros: crear publico"
  on evento_registros for insert
  to anon, authenticated
  with check (true);

drop policy if exists "evento_registros: leer solo admin" on evento_registros;
create policy "evento_registros: leer solo admin"
  on evento_registros for select
  to authenticated
  using (es_admin_activo());

drop policy if exists "evento_registros: actualizar solo admin" on evento_registros;
create policy "evento_registros: actualizar solo admin"
  on evento_registros for update
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());

-- FK a eventos, ahora que la tabla existe.
alter table evento_registros
  drop constraint if exists evento_registros_evento_id_fkey;
alter table evento_registros
  add constraint evento_registros_evento_id_fkey
  foreign key (evento_id) references eventos (id) on delete cascade;

drop policy if exists "evento_registros: borrar solo admin" on evento_registros;
create policy "evento_registros: borrar solo admin"
  on evento_registros for delete
  to authenticated
  using (es_admin_activo());


-- ─── presupuestos ──────────────────────────────────────────────────
-- id uuid (no Date.now()): el presupuesto se comparte por link público
-- en /presupuesto/[id], así que no debe ser adivinable ni enumerable.
create table if not exists presupuestos (
  id                 uuid primary key default gen_random_uuid(),
  referencia         text not null default '',   -- nombre interno para el listado
  cliente            text not null default '',
  telefono           text not null default '',
  email              text not null default '',
  precio_por_persona integer not null default 0,
  personas           integer not null default 0,
  intro              text not null default '',
  bloques            jsonb not null default '[]'::jsonb,  -- [{ titulo, grupos:[{ subtitulo, lineas[] }] }]
  notas              text not null default '',
  estado             text not null default 'borrador'
                     check (estado in ('borrador','enviado','aceptado','rechazado')),
  creado_en          timestamptz not null default now()
);

alter table presupuestos enable row level security;

-- Lectura pública solo del presupuesto ya enviado: el cliente abre su
-- link sin tener cuenta. El uuid hace de credencial.
create policy "presupuestos: leer enviados por link"
  on presupuestos for select
  to anon, authenticated
  using (estado <> 'borrador');

create policy "presupuestos: admin lee todo"
  on presupuestos for select
  to authenticated
  using (es_admin_activo());

create policy "presupuestos: admin escribe"
  on presupuestos for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());


-- ─── banner_slides ─────────────────────────────────────────────────
create table if not exists banner_slides (
  id          uuid primary key default gen_random_uuid(),
  etiqueta    text not null default '',
  titulo      text not null default '',
  descripcion text not null default '',
  imagen      text not null default '',   -- id de Unsplash, URL, o /uploads/...
  boton_texto text not null default '',
  boton_href  text not null default '',
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists banner_slides_activo_orden_idx
  on banner_slides (activo, orden);

alter table banner_slides enable row level security;

create policy "banner: leer activos"
  on banner_slides for select
  to anon, authenticated
  using (activo);

create policy "banner: admin lee todo"
  on banner_slides for select
  to authenticated
  using (es_admin_activo());

create policy "banner: admin escribe"
  on banner_slides for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());


-- ─── delivery_pedidos ──────────────────────────────────────────────
create table if not exists delivery_pedidos (
  id          uuid primary key default gen_random_uuid(),
  cliente     text not null default '',
  telefono    text not null default '',
  direccion   text not null default '',
  referencia  text not null default '',
  items       jsonb not null default '[]'::jsonb,  -- [{ nombre, cantidad, precio }]
  despacho    integer not null default 0,
  notas       text not null default '',
  repartidor  text not null default '',
  estado      text not null default 'recibido'
              check (estado in ('recibido','preparando','en_camino','entregado','cancelado')),
  -- Total congelado al crear: si después cambian los precios, la venta no se mueve.
  total       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists delivery_pedidos_estado_idx
  on delivery_pedidos (estado, created_at desc);

alter table delivery_pedidos enable row level security;

-- Solo admin: hoy los pedidos de delivery se cargan desde el panel.
create policy "delivery: solo admin"
  on delivery_pedidos for all
  to authenticated
  using (es_admin_activo())
  with check (es_admin_activo());


-- ─── clientes ──────────────────────────────────────────────────────
-- app/api/clientes/route.ts ya inserta acá, pero la tabla nunca existió:
-- ese endpoint venía fallando en runtime.
create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null default 'Cliente',
  email      text not null,
  telefono   text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists clientes_email_idx on clientes (lower(email));

alter table clientes enable row level security;

-- Alta pública (checkout), lectura solo admin.
create policy "clientes: alta publica"
  on clientes for insert
  to anon, authenticated
  with check (true);

create policy "clientes: leer solo admin"
  on clientes for select
  to authenticated
  using (es_admin_activo());
