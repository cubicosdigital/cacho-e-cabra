import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { requirePermiso } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { nombre, email, telefono, mensaje, tipo } = await req.json();
  if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
    return NextResponse.json({ error: "Falta nombre, email o mensaje" }, { status: 400 });
  }

  const { data, error } = await getSupabase().from("reclamos").insert({
    nombre: nombre.trim(), email: email.trim(), telefono: telefono?.trim() || null,
    mensaje: mensaje.trim(), tipo: tipo || "queja",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const g = await requirePermiso("reclamos", "r");
  if (g.error) return g.error;
  const db = g.db;

  const { data, error } = await db.from("reclamos").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
