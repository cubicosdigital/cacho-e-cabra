import { NextRequest, NextResponse } from "next/server";
import {
  getPresupuestos, savePresupuestos, limpiarItems,
  type Presupuesto,
} from "@/lib/presupuestos";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const g = await requirePermiso("presupuestos", "r");
  if (g.error) return g.error;
  return NextResponse.json(await getPresupuestos());
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("presupuestos", "c");
  if (g.error) return g.error;

  const body = await req.json();
  if (!body.cliente?.trim()) {
    return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
  }

  // Nace vacío. Si se elige una plantilla, se copia su contenido (queda independiente de ella).
  let base: { intro: string; bloques: unknown[]; items: unknown[]; notas: string; precio_por_persona: number } | null = null;
  if (body.plantillaId) {
    const { data } = await getSupabase().from("plantillas_presupuesto").select("intro, bloques, items, notas, precio_por_persona").eq("id", body.plantillaId).maybeSingle();
    if (!data) return NextResponse.json({ error: "La plantilla elegida no existe" }, { status: 404 });
    base = data;
  }

  const lista = await getPresupuestos();
  const nuevo: Presupuesto = {
    id: crypto.randomUUID(),
    referencia: body.referencia?.trim() || body.cliente.trim(),
    cliente: body.cliente.trim(),
    telefono: body.telefono?.trim() ?? "",
    email: body.email?.trim() ?? "",
    precioPorPersona: Number(body.precioPorPersona) || base?.precio_por_persona || 0,
    personas: Number(body.personas) || 0,
    intro: base?.intro ?? "",
    bloques: structuredClone((base?.bloques ?? []) as Presupuesto["bloques"]),
    items: limpiarItems(base?.items ?? []),
    notas: base?.notas ?? "",
    estado: "borrador",
    creadoEn: new Date().toISOString(),
  };

  await savePresupuestos([nuevo, ...lista]);
  return NextResponse.json(nuevo);
}
