import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getRegistros, saveRegistros } from "@/lib/registros";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const registros = await getRegistros();
  const idx = registros.findIndex(r => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

  // Solo se pueden cambiar los dos estados que maneja el admin.
  const actualizado = {
    ...registros[idx],
    ...(typeof body.pagado === "boolean" ? { pagado: body.pagado } : {}),
    ...(typeof body.confirmado === "boolean" ? { confirmado: body.confirmado } : {}),
  };
  registros[idx] = actualizado;
  await saveRegistros(registros);
  return NextResponse.json(actualizado);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const registros = await getRegistros();
  const restantes = registros.filter(r => r.id !== id);
  if (restantes.length === registros.length) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  await saveRegistros(restantes);
  return NextResponse.json({ ok: true });
}
