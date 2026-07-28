import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";

// Lista completa de cuentas admin — solo para que un admin vincule empleados a logins.
// RLS de usuarios_admin solo permite leer el propio registro, así que acá se valida
// el rol a mano y se usa el cliente con service key para traer la lista completa.
export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: yo } = await db.from("usuarios_admin").select("rol, activo").eq("email", user.email!).maybeSingle();
  if (!yo || yo.rol !== "admin" || !yo.activo) return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const { data, error } = await getSupabase().from("usuarios_admin").select("id, email, nombre, rol, activo").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
