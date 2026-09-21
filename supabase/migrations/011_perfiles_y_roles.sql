-- ════════════════════════════════════════════════════════════════════
-- Fase 6 — configuración: perfil personal y nuevos roles
-- ════════════════════════════════════════════════════════════════════

-- Nuevos roles: supervisor y coperia (se mantienen cocina y caja por compatibilidad)
alter table usuarios_admin drop constraint if exists usuarios_admin_rol_check;
alter table usuarios_admin add constraint usuarios_admin_rol_check
  check (rol in ('admin', 'supervisor', 'mesero', 'barra', 'coperia', 'cocina', 'caja'));

alter table tareas drop constraint if exists tareas_rol_destino_check;
alter table tareas add constraint tareas_rol_destino_check
  check (rol_destino in ('admin', 'supervisor', 'mesero', 'barra', 'coperia', 'cocina', 'caja'));

-- Información personal de cada usuario del sistema
alter table usuarios_admin add column if not exists telefono text;
alter table usuarios_admin add column if not exists rut text;
alter table usuarios_admin add column if not exists direccion text;
alter table usuarios_admin add column if not exists comuna text;
alter table usuarios_admin add column if not exists fecha_nacimiento date;
alter table usuarios_admin add column if not exists contacto_emergencia_nombre text;
alter table usuarios_admin add column if not exists contacto_emergencia_telefono text;
