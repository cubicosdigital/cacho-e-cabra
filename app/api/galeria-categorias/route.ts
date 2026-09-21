import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { requirePermiso } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const pideTodo = req.nextUrl.searchParams.get("todos") === "1";
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();

  const cliente = user && pideTodo ? db : getSupabase();
  const { data, error } = await cliente.from("galeria_categorias").select("*").order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("galeria", "c");
  if (g.error) return g.error;
  const db = g.db;

  const body = await req.json();
  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const { count } = await db.from("galeria_categorias").select("id", { count: "exact", head: true });

  const { data, error } = await db.from("galeria_categorias")
    .insert({ nombre: body.nombre.trim(), orden: count ?? 0 })
    .select().single();

  if (error) {
    const msg = error.code === "23505" ? "Ya existe una categoría con ese nombre" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json(data);
}
