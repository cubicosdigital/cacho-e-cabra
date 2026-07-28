import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await getSupabase()
    .from("productos")
    .select("*")
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
  const { data, error } = await db.from("productos").insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
