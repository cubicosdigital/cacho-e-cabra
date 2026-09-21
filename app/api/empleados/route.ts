import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { EMPLEADO_COLUMNAS } from "@/lib/empleados";

const CAMPOS_EMPLEADO = ["nombre", "rut", "cargo", "departamento", "tipo_contrato", "control_asistencia", "zk_id", "activo", "usuario_admin_id"];
function soloCamposPermitidos(body: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(body ?? {}).filter(([k]) => CAMPOS_EMPLEADO.includes(k)));
}

export async function GET() {
  const g = await requirePermiso();
  if (g.error) return g.error;

  const { data, error } = await g.db
    .from("empleados")
    .select(`${EMPLEADO_COLUMNAS}, usuarios_admin(email, nombre)`)
    .order("departamento", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("trabajadores", "c");
  if (g.error) return g.error;
  const db = getSupabase();

  const body = await req.json();
  const { data, error } = await db.from("empleados").insert(soloCamposPermitidos(body)).select(EMPLEADO_COLUMNAS).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
