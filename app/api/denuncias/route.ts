import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { tipo, descripcion, anonima, nombre_denunciante } = await req.json();
  if (!tipo || !descripcion?.trim()) return NextResponse.json({ error: "Falta tipo o descripción" }, { status: 400 });

  let empleado_id: string | null = null;
  if (!anonima) {
    const { data: yo } = await db.from("usuarios_admin").select("id").eq("email", user.email!).maybeSingle();
    if (yo) {
      const { data: emp } = await db.from("empleados").select("id").eq("usuario_admin_id", yo.id).maybeSingle();
      empleado_id = emp?.id ?? null;
    }
  }

  const { data, error } = await db.from("denuncias").insert({
    tipo, descripcion: descripcion.trim(), anonima: !!anonima,
    nombre_denunciante: anonima ? null : (nombre_denunciante?.trim() || null),
    empleado_id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await db.from("denuncias").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
