-- ════════════════════════════════════════════════════════════════════
-- Fase 9 — POS en caja, plantillas de presupuesto e ítems de presupuesto
-- ════════════════════════════════════════════════════════════════════

-- ─── Presupuestos: ítems múltiples y plantillas guardadas en la base de datos ───
alter table presupuestos add column if not exists items jsonb not null default '[]'::jsonb;

create table if not exists plantillas_presupuesto (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  intro               text not null default '',
  bloques             jsonb not null default '[]'::jsonb,
  items               jsonb not null default '[]'::jsonb,
  notas               text not null default '',
  precio_por_persona  integer not null default 0,
  created_at          timestamptz not null default now()
);
alter table plantillas_presupuesto enable row level security;
drop policy if exists "plantillas_presupuesto: ver (permiso)" on plantillas_presupuesto;
create policy "plantillas_presupuesto: ver (permiso)" on plantillas_presupuesto for select to authenticated using (tiene_permiso('presupuestos','r'));
drop policy if exists "plantillas_presupuesto: crear (permiso)" on plantillas_presupuesto;
create policy "plantillas_presupuesto: crear (permiso)" on plantillas_presupuesto for insert to authenticated with check (tiene_permiso('presupuestos','c'));
drop policy if exists "plantillas_presupuesto: editar (permiso)" on plantillas_presupuesto;
create policy "plantillas_presupuesto: editar (permiso)" on plantillas_presupuesto for update to authenticated using (tiene_permiso('presupuestos','u')) with check (tiene_permiso('presupuestos','u'));
drop policy if exists "plantillas_presupuesto: borrar (permiso)" on plantillas_presupuesto;
create policy "plantillas_presupuesto: borrar (permiso)" on plantillas_presupuesto for delete to authenticated using (tiene_permiso('presupuestos','d'));

-- La plantilla que antes vivía en el código pasa a ser la primera plantilla de la base de datos
insert into plantillas_presupuesto (nombre, intro, bloques)
select 'Buffet de Asado Premium', $intro$Estimado cliente, gracias por su interés en nuestros servicios, adjuntamos el presupuesto correspondiente a su solicitud. Si tiene alguna pregunta o necesita más información, no dude en ponerse en contacto con nosotros.$intro$, $bloques$[{"titulo": "Buffet de Asado Premium", "grupos": [{"subtitulo": "4 cortes de carne:", "lineas": ["Vacuno, Malaya, Costillar, Pollo."]}, {"subtitulo": "Buffet de ensaladas", "lineas": ["Ensalada chilena, Lechuga surtida, Ensalada de papas con mayonesa.", "Coleslaw, Arroz primavera."]}, {"subtitulo": "Pan, Salsas y acompañamientos:", "lineas": ["Pebre, chimichurri, salsa criolla y mayonesa casera."]}]}, {"titulo": "El servicio incluye", "grupos": [{"subtitulo": "", "lineas": ["- Parrillero Profesional", "- Montaje del buffet", "- Mantención y reposición de ensaladas durante el servicio"]}, {"subtitulo": "Considerar 2 tragos de la carta a elección:", "lineas": ["- Shop de cerveza", "- Coctelería", "- Destilado"]}]}]$bloques$::jsonb
where not exists (select 1 from plantillas_presupuesto where nombre = 'Buffet de Asado Premium');

-- ─── POS: cuentas por mesa que se pagan por partes ───
create table if not exists cuentas (
  id           uuid primary key default gen_random_uuid(),
  mesa         text not null,
  estado       text not null default 'abierta' check (estado in ('abierta', 'pagada', 'con_deuda')),
  abierta_at   timestamptz not null default now(),
  cerrada_at   timestamptz,
  abierta_por  uuid references usuarios_admin(id),
  nota_cierre  text
);
create index if not exists cuentas_estado_idx on cuentas(estado, abierta_at desc);

create table if not exists pagos (
  id              uuid primary key default gen_random_uuid(),
  cuenta_id       uuid not null references cuentas(id) on delete cascade,
  monto           integer not null check (monto > 0),
  propina         integer not null default 0 check (propina >= 0),
  metodo          text not null check (metodo in ('efectivo', 'debito', 'credito', 'transferencia', 'cortesia')),
  pagador         text not null default '',
  items           jsonb not null default '[]'::jsonb,
  anulado         boolean not null default false,
  anulado_motivo  text,
  cajero_id       uuid references usuarios_admin(id),
  created_at      timestamptz not null default now()
);
create index if not exists pagos_cuenta_idx on pagos(cuenta_id);

alter table pedidos add column if not exists cuenta_id uuid references cuentas(id) on delete set null;
create index if not exists pedidos_cuenta_idx on pedidos(cuenta_id);

alter table cuentas enable row level security;
alter table pagos enable row level security;
drop policy if exists "cuentas: ver (permiso)" on cuentas;
create policy "cuentas: ver (permiso)" on cuentas for select to authenticated using (tiene_permiso('pos','r'));
drop policy if exists "cuentas: crear (permiso)" on cuentas;
create policy "cuentas: crear (permiso)" on cuentas for insert to authenticated with check (tiene_permiso('pos','c'));
drop policy if exists "cuentas: editar (permiso)" on cuentas;
create policy "cuentas: editar (permiso)" on cuentas for update to authenticated using (tiene_permiso('pos','u')) with check (tiene_permiso('pos','u'));
drop policy if exists "cuentas: borrar (permiso)" on cuentas;
create policy "cuentas: borrar (permiso)" on cuentas for delete to authenticated using (tiene_permiso('pos','d'));
drop policy if exists "pagos: ver (permiso)" on pagos;
create policy "pagos: ver (permiso)" on pagos for select to authenticated using (tiene_permiso('pos','r'));
drop policy if exists "pagos: crear (permiso)" on pagos;
create policy "pagos: crear (permiso)" on pagos for insert to authenticated with check (tiene_permiso('pos','c'));
drop policy if exists "pagos: editar (permiso)" on pagos;
create policy "pagos: editar (permiso)" on pagos for update to authenticated using (tiene_permiso('pos','u')) with check (tiene_permiso('pos','u'));
drop policy if exists "pagos: borrar (permiso)" on pagos;
create policy "pagos: borrar (permiso)" on pagos for delete to authenticated using (tiene_permiso('pos','d'));
