-- ════════════════════════════════════════════════════════════════════
-- Fase 8 — permisos por módulo (crear / ver / editar / borrar) exigidos por la base de datos
--   • Solo las cuentas ACTIVAS del sistema pasan a ser "staff": un desconocido con sesión no ve nada.
--   • Cada módulo se rige por usuarios_admin.permisos -> { "modulos": { "galeria": ["r","u"] } }.
--   • El administrador (rol admin) puede todo.
-- ════════════════════════════════════════════════════════════════════

create or replace function es_staff_activo() returns boolean as $$
  select exists (
    select 1 from usuarios_admin
    where email = auth.jwt() ->> 'email' and activo
  );
$$ language sql stable security definer;

create or replace function tiene_permiso(p_modulo text, p_accion text) returns boolean as $$
  select exists (
    select 1 from usuarios_admin
    where email = auth.jwt() ->> 'email' and activo
      and (rol = 'admin' or coalesce(permisos -> 'modulos' -> p_modulo, '[]'::jsonb) ? p_accion)
  );
$$ language sql stable security definer;


-- ── Ventas ──
drop policy if exists "pedidos: leer y actualizar solo staff" on pedidos;
drop policy if exists "pedidos: actualizar solo staff" on pedidos;
drop policy if exists "pedidos: ver (permiso)" on pedidos;
create policy "pedidos: ver (permiso)" on pedidos for select to authenticated using (tiene_permiso('pedidos','r'));
drop policy if exists "pedidos: editar (permiso)" on pedidos;
create policy "pedidos: editar (permiso)" on pedidos for update to authenticated using (tiene_permiso('pedidos','u')) with check (tiene_permiso('pedidos','u'));
drop policy if exists "items_pedido: leer solo staff" on items_pedido;
drop policy if exists "items_pedido: ver (permiso)" on items_pedido;
create policy "items_pedido: ver (permiso)" on items_pedido for select to authenticated using (tiene_permiso('pedidos','r'));
drop policy if exists "delivery: solo admin" on delivery_pedidos;
drop policy if exists "delivery_pedidos: ver (permiso)" on delivery_pedidos;
create policy "delivery_pedidos: ver (permiso)" on delivery_pedidos for select to authenticated using (tiene_permiso('delivery','r'));
drop policy if exists "delivery_pedidos: crear (permiso)" on delivery_pedidos;
create policy "delivery_pedidos: crear (permiso)" on delivery_pedidos for insert to authenticated with check (tiene_permiso('delivery','c'));
drop policy if exists "delivery_pedidos: editar (permiso)" on delivery_pedidos;
create policy "delivery_pedidos: editar (permiso)" on delivery_pedidos for update to authenticated using (tiene_permiso('delivery','u')) with check (tiene_permiso('delivery','u'));
drop policy if exists "delivery_pedidos: borrar (permiso)" on delivery_pedidos;
create policy "delivery_pedidos: borrar (permiso)" on delivery_pedidos for delete to authenticated using (tiene_permiso('delivery','d'));
drop policy if exists "presupuestos: admin lee todo" on presupuestos;
drop policy if exists "presupuestos: admin escribe" on presupuestos;
drop policy if exists "presupuestos: ver (permiso)" on presupuestos;
create policy "presupuestos: ver (permiso)" on presupuestos for select to authenticated using (tiene_permiso('presupuestos','r'));
drop policy if exists "presupuestos: crear (permiso)" on presupuestos;
create policy "presupuestos: crear (permiso)" on presupuestos for insert to authenticated with check (tiene_permiso('presupuestos','c'));
drop policy if exists "presupuestos: editar (permiso)" on presupuestos;
create policy "presupuestos: editar (permiso)" on presupuestos for update to authenticated using (tiene_permiso('presupuestos','u')) with check (tiene_permiso('presupuestos','u'));
drop policy if exists "presupuestos: borrar (permiso)" on presupuestos;
create policy "presupuestos: borrar (permiso)" on presupuestos for delete to authenticated using (tiene_permiso('presupuestos','d'));

-- ── Local ──
drop policy if exists "productos: escritura solo admin" on productos;
drop policy if exists "productos: crear (permiso)" on productos;
create policy "productos: crear (permiso)" on productos for insert to authenticated with check (tiene_permiso('menu','c'));
drop policy if exists "productos: editar (permiso)" on productos;
create policy "productos: editar (permiso)" on productos for update to authenticated using (tiene_permiso('menu','u')) with check (tiene_permiso('menu','u'));
drop policy if exists "productos: borrar (permiso)" on productos;
create policy "productos: borrar (permiso)" on productos for delete to authenticated using (tiene_permiso('menu','d'));
drop policy if exists "mesas: escritura solo admin" on mesas;
drop policy if exists "mesas: crear (permiso)" on mesas;
create policy "mesas: crear (permiso)" on mesas for insert to authenticated with check (tiene_permiso('mesas','u'));
drop policy if exists "mesas: editar (permiso)" on mesas;
create policy "mesas: editar (permiso)" on mesas for update to authenticated using (tiene_permiso('mesas','u')) with check (tiene_permiso('mesas','u'));
drop policy if exists "mesas: borrar (permiso)" on mesas;
create policy "mesas: borrar (permiso)" on mesas for delete to authenticated using (tiene_permiso('mesas','u'));
drop policy if exists "reclamos: leer y gestionar solo admin" on reclamos;
drop policy if exists "reclamos: actualizar solo admin" on reclamos;
drop policy if exists "reclamos: ver (permiso)" on reclamos;
create policy "reclamos: ver (permiso)" on reclamos for select to authenticated using (tiene_permiso('reclamos','r'));
drop policy if exists "reclamos: editar (permiso)" on reclamos;
create policy "reclamos: editar (permiso)" on reclamos for update to authenticated using (tiene_permiso('reclamos','u')) with check (tiene_permiso('reclamos','u'));
drop policy if exists "denuncias: crear staff logueado" on denuncias;
drop policy if exists "denuncias: leer y gestionar solo admin" on denuncias;
drop policy if exists "denuncias: actualizar solo admin" on denuncias;
drop policy if exists "denuncias: ver (permiso)" on denuncias;
create policy "denuncias: ver (permiso)" on denuncias for select to authenticated using (tiene_permiso('denuncias','r'));
drop policy if exists "denuncias: crear (permiso)" on denuncias;
create policy "denuncias: crear (permiso)" on denuncias for insert to authenticated with check (tiene_permiso('denuncias','c'));
drop policy if exists "denuncias: editar (permiso)" on denuncias;
create policy "denuncias: editar (permiso)" on denuncias for update to authenticated using (tiene_permiso('denuncias','u')) with check (tiene_permiso('denuncias','u'));

-- ── Contenido ──
drop policy if exists "banner: admin lee todo" on banner_slides;
drop policy if exists "banner: admin escribe" on banner_slides;
drop policy if exists "banner_slides: ver (permiso)" on banner_slides;
create policy "banner_slides: ver (permiso)" on banner_slides for select to authenticated using (tiene_permiso('banner','r'));
drop policy if exists "banner_slides: crear (permiso)" on banner_slides;
create policy "banner_slides: crear (permiso)" on banner_slides for insert to authenticated with check (tiene_permiso('banner','c'));
drop policy if exists "banner_slides: editar (permiso)" on banner_slides;
create policy "banner_slides: editar (permiso)" on banner_slides for update to authenticated using (tiene_permiso('banner','u')) with check (tiene_permiso('banner','u'));
drop policy if exists "banner_slides: borrar (permiso)" on banner_slides;
create policy "banner_slides: borrar (permiso)" on banner_slides for delete to authenticated using (tiene_permiso('banner','d'));
drop policy if exists "galeria: admin lee todo" on galeria_items;
drop policy if exists "galeria: admin escribe" on galeria_items;
drop policy if exists "galeria_items: ver (permiso)" on galeria_items;
create policy "galeria_items: ver (permiso)" on galeria_items for select to authenticated using (tiene_permiso('galeria','r'));
drop policy if exists "galeria_items: crear (permiso)" on galeria_items;
create policy "galeria_items: crear (permiso)" on galeria_items for insert to authenticated with check (tiene_permiso('galeria','c'));
drop policy if exists "galeria_items: editar (permiso)" on galeria_items;
create policy "galeria_items: editar (permiso)" on galeria_items for update to authenticated using (tiene_permiso('galeria','u')) with check (tiene_permiso('galeria','u'));
drop policy if exists "galeria_items: borrar (permiso)" on galeria_items;
create policy "galeria_items: borrar (permiso)" on galeria_items for delete to authenticated using (tiene_permiso('galeria','d'));
drop policy if exists "galeria_categorias: admin lee todo" on galeria_categorias;
drop policy if exists "galeria_categorias: admin escribe" on galeria_categorias;
drop policy if exists "galeria_categorias: ver (permiso)" on galeria_categorias;
create policy "galeria_categorias: ver (permiso)" on galeria_categorias for select to authenticated using (tiene_permiso('galeria','r'));
drop policy if exists "galeria_categorias: crear (permiso)" on galeria_categorias;
create policy "galeria_categorias: crear (permiso)" on galeria_categorias for insert to authenticated with check (tiene_permiso('galeria','c'));
drop policy if exists "galeria_categorias: editar (permiso)" on galeria_categorias;
create policy "galeria_categorias: editar (permiso)" on galeria_categorias for update to authenticated using (tiene_permiso('galeria','u')) with check (tiene_permiso('galeria','u'));
drop policy if exists "galeria_categorias: borrar (permiso)" on galeria_categorias;
create policy "galeria_categorias: borrar (permiso)" on galeria_categorias for delete to authenticated using (tiene_permiso('galeria','d'));
drop policy if exists "eventos: admin lee todo" on eventos;
drop policy if exists "eventos: admin escribe" on eventos;
drop policy if exists "eventos: ver (permiso)" on eventos;
create policy "eventos: ver (permiso)" on eventos for select to authenticated using (tiene_permiso('eventos','r'));
drop policy if exists "eventos: crear (permiso)" on eventos;
create policy "eventos: crear (permiso)" on eventos for insert to authenticated with check (tiene_permiso('eventos','c'));
drop policy if exists "eventos: editar (permiso)" on eventos;
create policy "eventos: editar (permiso)" on eventos for update to authenticated using (tiene_permiso('eventos','u')) with check (tiene_permiso('eventos','u'));
drop policy if exists "eventos: borrar (permiso)" on eventos;
create policy "eventos: borrar (permiso)" on eventos for delete to authenticated using (tiene_permiso('eventos','d'));
drop policy if exists "evento_registros: leer solo admin" on evento_registros;
drop policy if exists "evento_registros: actualizar solo admin" on evento_registros;
drop policy if exists "evento_registros: borrar solo admin" on evento_registros;
drop policy if exists "evento_registros: ver (permiso)" on evento_registros;
create policy "evento_registros: ver (permiso)" on evento_registros for select to authenticated using (tiene_permiso('invitados','r'));
drop policy if exists "evento_registros: editar (permiso)" on evento_registros;
create policy "evento_registros: editar (permiso)" on evento_registros for update to authenticated using (tiene_permiso('invitados','u')) with check (tiene_permiso('invitados','u'));
drop policy if exists "evento_registros: borrar (permiso)" on evento_registros;
create policy "evento_registros: borrar (permiso)" on evento_registros for delete to authenticated using (tiene_permiso('invitados','d'));

-- ── Personas ──
drop policy if exists "tareas: lectura staff" on tareas;
drop policy if exists "tareas: escritura solo admin" on tareas;
drop policy if exists "tareas: lectura staff" on tareas;
create policy "tareas: lectura staff" on tareas for select to authenticated using (es_staff_activo());
drop policy if exists "tareas: crear (permiso)" on tareas;
create policy "tareas: crear (permiso)" on tareas for insert to authenticated with check (tiene_permiso('tareas','c'));
drop policy if exists "tareas: editar (permiso)" on tareas;
create policy "tareas: editar (permiso)" on tareas for update to authenticated using (tiene_permiso('tareas','u')) with check (tiene_permiso('tareas','u'));
drop policy if exists "tareas: borrar (permiso)" on tareas;
create policy "tareas: borrar (permiso)" on tareas for delete to authenticated using (tiene_permiso('tareas','d'));
drop policy if exists "turnos: lectura staff" on turnos;
drop policy if exists "turnos: escritura solo admin" on turnos;
drop policy if exists "turnos: lectura staff" on turnos;
create policy "turnos: lectura staff" on turnos for select to authenticated using (es_staff_activo());
drop policy if exists "turnos: crear (permiso)" on turnos;
create policy "turnos: crear (permiso)" on turnos for insert to authenticated with check (tiene_permiso('turnos','u'));
drop policy if exists "turnos: editar (permiso)" on turnos;
create policy "turnos: editar (permiso)" on turnos for update to authenticated using (tiene_permiso('turnos','u')) with check (tiene_permiso('turnos','u'));
drop policy if exists "turnos: borrar (permiso)" on turnos;
create policy "turnos: borrar (permiso)" on turnos for delete to authenticated using (tiene_permiso('turnos','u'));
drop policy if exists "asistencias: admin ve todas, cada uno las suyas" on asistencias;
drop policy if exists "asistencias: escritura solo admin" on asistencias;
drop policy if exists "asistencias: lectura staff" on asistencias;
drop policy if exists "asistencias: ver (permiso o propias)" on asistencias;
create policy "asistencias: ver (permiso o propias)" on asistencias for select to authenticated using (tiene_permiso('asistencia','r') or (es_staff_activo() and empleado_id = mi_empleado_id()));
drop policy if exists "asistencias: crear (permiso)" on asistencias;
create policy "asistencias: crear (permiso)" on asistencias for insert to authenticated with check (tiene_permiso('asistencia','c'));
drop policy if exists "asistencias: editar (permiso)" on asistencias;
create policy "asistencias: editar (permiso)" on asistencias for update to authenticated using (tiene_permiso('asistencia','u')) with check (tiene_permiso('asistencia','u'));
drop policy if exists "asistencias: borrar (permiso)" on asistencias;
create policy "asistencias: borrar (permiso)" on asistencias for delete to authenticated using (tiene_permiso('asistencia','d'));
drop policy if exists "empleados: lectura staff" on empleados;
drop policy if exists "empleados: escritura solo admin" on empleados;
drop policy if exists "empleados: lectura staff" on empleados;
create policy "empleados: lectura staff" on empleados for select to authenticated using (es_staff_activo());
drop policy if exists "empleados: crear (permiso)" on empleados;
create policy "empleados: crear (permiso)" on empleados for insert to authenticated with check (tiene_permiso('trabajadores','c'));
drop policy if exists "empleados: editar (permiso)" on empleados;
create policy "empleados: editar (permiso)" on empleados for update to authenticated using (tiene_permiso('trabajadores','u')) with check (tiene_permiso('trabajadores','u'));
