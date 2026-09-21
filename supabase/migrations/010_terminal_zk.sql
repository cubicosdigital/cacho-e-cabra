-- ════════════════════════════════════════════════════════════════════
-- Fase 5 — control remoto del terminal ZK (puente en el local)
-- ════════════════════════════════════════════════════════════════════

-- Una sola fila: lo último que informó el puente sobre el terminal
create table if not exists terminal_estado (
  id                text primary key default 'principal',
  terminal_ok       boolean not null default false, -- el puente logró hablar con el terminal
  ip                text,
  serie             text,
  firmware          text,
  hora_terminal     text, -- 'YYYY-MM-DD HH:MM:SS' tal como la muestra el terminal
  usuarios          integer,
  marcaciones       integer,
  usuarios_detalle  jsonb not null default '[]'::jsonb, -- [{uid, user_id, name, huellas}]
  ultima_marca      text, -- 'YYYY-MM-DD HH:MM:SS' de la última marcación ya descargada
  ultima_sync       timestamptz,
  ultimo_latido     timestamptz,
  mensaje           text
);

-- Órdenes que el admin deja en cola y el puente ejecuta
create table if not exists terminal_comandos (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('sincronizar_usuarios', 'ajustar_hora', 'iniciar_huella', 'borrar_usuario', 'descargar_marcaciones')),
  payload       jsonb not null default '{}'::jsonb,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'ok', 'error')),
  resultado     text,
  created_at    timestamptz not null default now(),
  ejecutado_at  timestamptz
);

create index if not exists terminal_comandos_estado_idx on terminal_comandos(estado, created_at);

alter table terminal_estado enable row level security;
alter table terminal_comandos enable row level security;

create policy "terminal_estado: solo admin" on terminal_estado for all to authenticated
  using (es_admin_activo()) with check (es_admin_activo());
create policy "terminal_comandos: solo admin" on terminal_comandos for all to authenticated
  using (es_admin_activo()) with check (es_admin_activo());
