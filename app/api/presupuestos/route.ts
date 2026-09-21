import { NextRequest, NextResponse } from "next/server";
import {
  getPresupuestos, savePresupuestos, INTRO_POR_DEFECTO, PLANTILLA_ASADO,
  type Presupuesto,
} from "@/lib/presupuestos";
import { requirePermiso } from "@/lib/admin-auth";

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

  const lista = await getPresupuestos();
  const nuevo: Presupuesto = {
    id: crypto.randomUUID(),
    referencia: body.referencia?.trim() || body.cliente.trim(),
    cliente: body.cliente.trim(),
    telefono: body.telefono?.trim() ?? "",
    email: body.email?.trim() ?? "",
    precioPorPersona: Number(body.precioPorPersona) || 0,
    personas: Number(body.personas) || 0,
    intro: body.intro ?? INTRO_POR_DEFECTO,
    bloques: Array.isArray(body.bloques) && body.bloques.length > 0
      ? body.bloques
      : structuredClone(PLANTILLA_ASADO),
    notas: body.notas ?? "",
    estado: "borrador",
    creadoEn: new Date().toISOString(),
  };

  await savePresupuestos([nuevo, ...lista]);
  return NextResponse.json(nuevo);
}
