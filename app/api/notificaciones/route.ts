import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const { db, error } = await requireAdmin();
  if (error) return error;

  if (new URL(req.url).searchParams.get("contar") === "1") {
    const { count } = await db.from("notificaciones").select("id", { count: "exact", head: true }).eq("leida", false);
    return NextResponse.json({ no_leidas: count ?? 0 });
  }

  const { data, error: err } = await db.from("notificaciones").select("*").order("created_at", { ascending: false }).limit(100);
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json(data);
}

// Sin `id` marca todas como leídas.
export async function PATCH(req: NextRequest) {
  const { db, error } = await requireAdmin();
  if (error) return error;

  const { id } = await req.json().catch(() => ({}));
  const q = db.from("notificaciones").update({ leida: true }).eq("leida", false);
  const { error: err } = await (id ? q.eq("id", id) : q);
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
