/** Columnas de `empleados` que cualquier usuario con sesión puede leer. El RUT queda fuera: solo lo lee el servidor para el administrador. */
export const EMPLEADO_COLUMNAS = "id, nombre, departamento, tipo_contrato, usuario_admin_id, activo, created_at, cargo, control_asistencia, zk_id";
