import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await db
    .from("turnos")
    .select("*, empleados(nombre, departamento, tipo_contrato)")
    .order("dia_semana", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Reemplaza la semana completa de un empleado para la temporada indicada.
export async function PUT(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { empleado_id, temporada, turnos } = await req.json();
  if (!empleado_id || !temporada || !Array.isArray(turnos)) {
    return NextResponse.json({ error: "Falta empleado_id, temporada o turnos" }, { status: 400 });
  }

  const { error: errDel } = await db.from("turnos").delete().eq("empleado_id", empleado_id).eq("temporada", temporada);
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 403 });

  const filas = turnos.map((t: Record<string, unknown>) => ({ ...t, empleado_id, temporada }));
  const { error: errIns } = await db.from("turnos").insert(filas);
  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}
