import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: usuarioAdmin } = await db.from("usuarios_admin").select("id").eq("email", user.email!).maybeSingle();
  if (!usuarioAdmin) return NextResponse.json({ empleado: null, turnos: [] });

  const { data: empleado } = await db.from("empleados").select("*").eq("usuario_admin_id", usuarioAdmin.id).maybeSingle();
  if (!empleado) return NextResponse.json({ empleado: null, turnos: [] });

  const { data: turnos, error } = await db
    .from("turnos")
    .select("*")
    .eq("empleado_id", empleado.id)
    .order("dia_semana", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ empleado, turnos });
}
