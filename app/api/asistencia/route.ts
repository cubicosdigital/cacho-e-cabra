import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";

const PAGINA = 1000;

export async function GET(req: Request) {
  const g = await requirePermiso();
  if (g.error) return g.error;
  const db = g.db;

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const empleadoId = searchParams.get("empleado_id");

  // PostgREST corta en 1000 filas por consulta: se pide por páginas hasta traer todo.
  const filas: unknown[] = [];
  for (let desdeFila = 0; ; desdeFila += PAGINA) {
    let query = db
      .from("asistencias")
      .select("*, empleados(nombre, cargo, departamento)")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .order("id", { ascending: true })
      .range(desdeFila, desdeFila + PAGINA - 1);

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);
    if (empleadoId) query = query.eq("empleado_id", empleadoId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    filas.push(...data);
    if (data.length < PAGINA) break;
  }

  return NextResponse.json(filas);
}
