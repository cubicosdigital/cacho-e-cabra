-- ════════════════════════════════════════════════════════════════════
-- Fase 7 — privacidad entre trabajadores
-- ════════════════════════════════════════════════════════════════════

-- 1) El RUT de los trabajadores solo lo lee el servidor (para el administrador).
--    Cualquier usuario con sesión sigue viendo el resto de las columnas (nombre, cargo, etc.).
revoke select on empleados from anon, authenticated;
grant select (id, nombre, departamento, tipo_contrato, usuario_admin_id, activo, created_at, cargo, control_asistencia, zk_id)
  on empleados to authenticated;

-- 2) Marcaciones de asistencia: el administrador ve todas; cada trabajador, solo las suyas.
drop policy if exists "asistencias: lectura staff" on asistencias;
create policy "asistencias: admin ve todas, cada uno las suyas"
  on asistencias for select
  to authenticated
  using (es_admin_activo() or empleado_id = mi_empleado_id());
