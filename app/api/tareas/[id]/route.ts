import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: yo } = await db.from("usuarios_admin").select("rol, activo").eq("email", user.email!).maybeSingle();
  const esAdmin = !!yo && yo.rol === "admin" && yo.activo;

  const body = await req.json();
  // Un usuario no-admin solo puede tocar el estado de sus propias tareas (reforzado además por RLS).
  const payload = esAdmin ? body : { estado: body.estado };

  const { data, error } = await db.from("tareas").update(payload).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { error } = await db.from("tareas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
