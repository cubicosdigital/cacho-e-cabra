-- Vacaciones / licencia / permiso: no cuenta como ausencia ni da alertas. Termina sola cuando la persona vuelve a marcar.
alter table empleados add column if not exists ausencia_tipo text check (ausencia_tipo in ('vacaciones', 'licencia', 'permiso'));
alter table empleados add column if not exists ausencia_desde date;
alter table empleados add column if not exists ausencia_hasta date;
grant select (ausencia_tipo, ausencia_desde, ausencia_hasta) on empleados to authenticated;
update empleados set ausencia_tipo = 'vacaciones', ausencia_desde = current_date where nombre ilike 'Sebastian Exequiel%' and activo;
