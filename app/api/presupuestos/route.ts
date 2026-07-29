import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  getPresupuestos, savePresupuestos, INTRO_POR_DEFECTO, PLANTILLA_ASADO,
  type Presupuesto,
} from "@/lib/presupuestos";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json(await getPresupuestos());
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
