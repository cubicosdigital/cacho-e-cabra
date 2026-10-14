-- Minutos de colación que se descuentan de cada turno, por trabajador (por defecto 30).
alter table empleados add column if not exists colacion_min integer not null default 30 check (colacion_min between 0 and 240);
grant select (colacion_min) on empleados to authenticated;
