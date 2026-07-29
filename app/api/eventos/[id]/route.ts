import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getEventos, saveEventos } from "@/lib/eventos";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const eventos = await getEventos();
  const restantes = eventos.filter(e => e.id !== id);
  if (restantes.length === eventos.length) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  await saveEventos(restantes);
  return NextResponse.json({ ok: true });
}
