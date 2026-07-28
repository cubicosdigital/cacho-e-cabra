import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data } = await db.from("usuarios_admin").select("id, nombre, rol").eq("email", user.email!).maybeSingle();
  if (!data) return NextResponse.json(null);

  const { data: empleado } = await db.from("empleados").select("id").eq("usuario_admin_id", data.id).maybeSingle();
  return NextResponse.json({ ...data, empleado_id: empleado?.id ?? null });
}
