import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("reclamos", "u");
  if (g.error) return g.error;
  const db = g.db;

  const body = await req.json();
  const { data, error } = await db.from("reclamos").update(body).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
