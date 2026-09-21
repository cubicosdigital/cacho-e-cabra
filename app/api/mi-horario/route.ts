import { NextResponse } from "next/server";
import { EMPLEADO_COLUMNAS } from "@/lib/empleados";
import { requirePermiso } from "@/lib/admin-auth";

export async function GET() {
  const g = await requirePermiso();
  if (g.error) return g.error;
  const db = g.db;

  const usuarioAdmin = { id: g.usuario.id };

  const { data: empleado } = await db.from("empleados").select(EMPLEADO_COLUMNAS).eq("usuario_admin_id", usuarioAdmin.id).maybeSingle();
  if (!empleado) return NextResponse.json({ empleado: null, turnos: [] });

  const { data: turnos, error } = await db
    .from("turnos")
    .select("*")
    .eq("empleado_id", empleado.id)
    .order("dia_semana", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ empleado, turnos });
}
