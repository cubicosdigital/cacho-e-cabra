import { NextRequest, NextResponse } from "next/server";
import { getEventos, saveEventos } from "@/lib/eventos";
import { requirePermiso } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("eventos", "u");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const patch = await req.json();
  const eventos = await getEventos();
  const idx = eventos.findIndex(e => e.id === id);
  if (idx === -1) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const actualizado = { ...eventos[idx], ...patch, id };
  eventos[idx] = actualizado;
  await saveEventos(eventos);
  return NextResponse.json(actualizado);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("eventos", "d");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const eventos = await getEventos();
  const restantes = eventos.filter(e => e.id !== id);
  if (restantes.length === eventos.length) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  await saveEventos(restantes);
  return NextResponse.json({ ok: true });
}
