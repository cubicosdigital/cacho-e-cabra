import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("galeria", "u");
  if (g.error) return g.error;
  const db = g.db;

  const body = await req.json();
  const { data, error } = await db.from("galeria_categorias").update(body).eq("id", id).select().single();

  if (error) {
    const msg = error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("galeria", "d");
  if (g.error) return g.error;
  const db = g.db;

  const { error } = await db.from("galeria_categorias").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
