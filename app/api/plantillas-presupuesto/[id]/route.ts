import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { aFilaPlantilla } from "@/lib/presupuestos";

const COLUMNAS = "id, nombre, intro, bloques, items, notas, precio_por_persona, created_at";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("presupuestos", "u");
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const fila = aFilaPlantilla(await req.json().catch(() => ({})));
  if (!fila.nombre) return NextResponse.json({ error: "La plantilla necesita un nombre" }, { status: 400 });
  const { data, error } = await getSupabase().from("plantillas_presupuesto").update(fila).eq("id", id).select(COLUMNAS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("presupuestos", "d");
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const { error } = await getSupabase().from("plantillas_presupuesto").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
