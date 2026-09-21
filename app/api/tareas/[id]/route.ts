import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { puede } from "@/lib/permisos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("tareas", "u");
  if (g.error) return g.error;
  const db = g.db;
  const gestor = puede(g.usuario.rol, g.usuario.permisos, "tareas", "c");

  const body = await req.json();
  // Quien gestiona tareas (puede crearlas) las edita completas; el resto solo cambia el estado de las suyas (reforzado además por RLS).
  const payload = gestor ? body : { estado: body.estado };

  const { data, error } = await db.from("tareas").update(payload).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("tareas", "d");
  if (g.error) return g.error;
  const db = g.db;

  const { error } = await db.from("tareas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
