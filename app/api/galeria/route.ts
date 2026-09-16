import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const pideTodo = req.nextUrl.searchParams.get("todos") === "1";
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();

  // El admin (autenticado) puede pedir todo, incluso lo oculto; el público solo ve lo activo.
  const cliente = user && pideTodo ? db : getSupabase();
  const { data, error } = await cliente.from("galeria_items").select("*")
    .order("tipo", { ascending: true })
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await db.from("galeria_items").insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
