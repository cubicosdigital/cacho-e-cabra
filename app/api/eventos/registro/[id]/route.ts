import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getRegistros, saveRegistros } from "@/lib/registros";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("invitados", "u");
  if (g.error) return g.error;

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
  const g = await requirePermiso("invitados", "d");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const registros = await getRegistros();
  const restantes = registros.filter(r => r.id !== id);
  if (restantes.length === registros.length) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  await saveRegistros(restantes);
  return NextResponse.json({ ok: true });
}
