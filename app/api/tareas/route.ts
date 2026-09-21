import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";

export async function GET() {
  const g = await requirePermiso();
  if (g.error) return g.error;

  const { data, error } = await g.db
    .from("tareas")
    .select("*, empleados(nombre)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("tareas", "c");
  if (g.error) return g.error;
  const db = g.db;
  const yo = { id: g.usuario.id };

  const body = await req.json();
  const { data, error } = await db.from("tareas").insert({ ...body, creado_por: yo.id }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
