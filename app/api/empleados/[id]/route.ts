import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { EMPLEADO_COLUMNAS } from "@/lib/empleados";

const CAMPOS_EMPLEADO = ["nombre", "rut", "cargo", "departamento", "tipo_contrato", "control_asistencia", "zk_id", "activo", "usuario_admin_id"];
function soloCamposPermitidos(body: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(body ?? {}).filter(([k]) => CAMPOS_EMPLEADO.includes(k)));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("trabajadores", "u");
  if (g.error) return g.error;
  const db = getSupabase();

  const body = await req.json();
  const { data, error } = await db.from("empleados").update(soloCamposPermitidos(body)).eq("id", id).select(EMPLEADO_COLUMNAS).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}

// Borra al trabajador solo si no tiene historial (turnos o asistencia): eso evita borrar en cadena
// datos reales. Con historial, se debe usar "dar de baja" (PATCH activo:false), que es reversible.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("trabajadores", "d");
  if (g.error) return g.error;
  const db = getSupabase();

  const [turnos, asistencias] = await Promise.all([
    db.from("turnos").select("id", { count: "exact", head: true }).eq("empleado_id", id),
    db.from("asistencias").select("id", { count: "exact", head: true }).eq("empleado_id", id),
  ]);
  const totalHistorial = (turnos.count ?? 0) + (asistencias.count ?? 0);
  if (totalHistorial > 0) {
    return NextResponse.json({
      error: `Tiene ${turnos.count ?? 0} turno(s) y ${asistencias.count ?? 0} registro(s) de asistencia guardados. Para conservar ese historial, usa "Dar de baja" en vez de eliminar.`,
    }, { status: 409 });
  }

  const { error } = await db.from("empleados").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
