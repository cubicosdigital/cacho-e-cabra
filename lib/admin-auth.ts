import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";
import type { Rol } from "@/lib/roles";
import { puede, type Accion, type Modulo, type PermisosGuardados } from "@/lib/permisos";

export interface Usuario { id: string; email: string; nombre: string; rol: Rol; permisos: PermisosGuardados }

type Resultado =
  | { db: Awaited<ReturnType<typeof supabaseServer>>; usuario: Usuario; error: null }
  | { db: Awaited<ReturnType<typeof supabaseServer>>; usuario: null; error: NextResponse };

/**
 * Comprueba quién llama: debe tener sesión y una cuenta ACTIVA en el sistema (una sesión sola no basta).
 * Si se indica módulo y acción, además exige ese permiso. El administrador puede todo.
 * Devuelve el cliente con la sesión de la persona (las reglas de la base de datos siguen aplicando).
 */
export async function requirePermiso(modulo?: Modulo, accion: Accion = "r"): Promise<Resultado> {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return { db, usuario: null, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const { data: u } = await getSupabase().from("usuarios_admin").select("id, email, nombre, rol, activo, permisos").eq("email", user.email).maybeSingle();
  if (!u || !u.activo) return { db, usuario: null, error: NextResponse.json({ error: "Tu cuenta no está habilitada" }, { status: 403 }) };

  const usuario = u as unknown as Usuario;
  if (modulo && !puede(usuario.rol, usuario.permisos, modulo, accion)) {
    return { db, usuario: null, error: NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) };
  }
  return { db, usuario, error: null };
}

/** Cualquier persona con cuenta activa. */
export const requireStaff = () => requirePermiso();

/** Solo administrador (usuarios, permisos, terminal, dashboard…). */
export async function requireAdmin() {
  const r = await requirePermiso();
  if (r.error) return { db: r.db, usuario: null, error: r.error };
  if (r.usuario.rol !== "admin") return { db: r.db, usuario: null, error: NextResponse.json({ error: "Solo administrador" }, { status: 403 }) };
  return { db: r.db, usuario: r.usuario, error: null };
}
