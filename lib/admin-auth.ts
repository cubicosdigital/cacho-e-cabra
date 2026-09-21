import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

/** Valida que quien llama sea un admin activo. Devuelve el cliente con su sesión o la respuesta de error. */
export async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const { data: yo } = await db.from("usuarios_admin").select("rol, activo").eq("email", user.email!).maybeSingle();
  if (!yo || yo.rol !== "admin" || !yo.activo) return { db, error: NextResponse.json({ error: "Solo admin" }, { status: 403 }) };
  return { db, error: null };
}
