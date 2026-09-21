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
