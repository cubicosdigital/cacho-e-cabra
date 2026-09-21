import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { aFilaPlantilla } from "@/lib/presupuestos";

const COLUMNAS = "id, nombre, intro, bloques, items, notas, precio_por_persona, created_at";

export async function GET() {
  const g = await requirePermiso("presupuestos", "r");
  if (g.error) return g.error;
  const { data, error } = await getSupabase().from("plantillas_presupuesto").select(COLUMNAS).order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("presupuestos", "c");
  if (g.error) return g.error;
  const fila = aFilaPlantilla(await req.json().catch(() => ({})));
  if (!fila.nombre) return NextResponse.json({ error: "La plantilla necesita un nombre" }, { status: 400 });
  const { data, error } = await getSupabase().from("plantillas_presupuesto").insert(fila).select(COLUMNAS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
