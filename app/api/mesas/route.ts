import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await getSupabase().from("mesas").select("*").order("numero", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Reemplaza el layout completo: borra todas las mesas y vuelve a insertar las recibidas.
export async function PUT(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { mesas } = await req.json();

  const { error: errDel } = await db.from("mesas").delete().neq("numero", -1);
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 403 });

  if (Array.isArray(mesas) && mesas.length > 0) {
    const { error: errIns } = await db.from("mesas").insert(mesas);
    if (errIns) return NextResponse.json({ error: errIns.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
