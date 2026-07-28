import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await db
    .from("tareas")
    .select("*, empleados(nombre)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: yo } = await db.from("usuarios_admin").select("id, rol, activo").eq("email", user.email!).maybeSingle();
  if (!yo || yo.rol !== "admin" || !yo.activo) return NextResponse.json({ error: "Solo admin puede crear tareas" }, { status: 403 });

  const body = await req.json();
  const { data, error } = await db.from("tareas").insert({ ...body, creado_por: yo.id }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
