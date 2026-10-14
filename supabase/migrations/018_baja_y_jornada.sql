-- Baja de trabajadores con motivo, y tipo de jornada (art. 22 = sin control de jornada ni turnos).
alter table empleados add column if not exists jornada_tipo text not null default 'ordinaria' check (jornada_tipo in ('ordinaria', 'art22'));
alter table empleados add column if not exists fecha_baja date;
alter table empleados add column if not exists motivo_baja text check (motivo_baja in ('despido', 'renuncia', 'otro'));
alter table empleados add column if not exists detalle_baja text;
grant select (jornada_tipo) on empleados to authenticated;
