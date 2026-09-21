import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { TODOS_LOS_ROLES, type Rol } from "@/lib/roles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const b = await req.json().catch(() => ({}));
  const db = getSupabase();
  const { data: objetivo } = await db.from("usuarios_admin").select("id, email, rol, activo, permisos").eq("id", id).maybeSingle();
  if (!objetivo) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const esUnoMismo = user?.email === objetivo.email;

  const cambios: Record<string, unknown> = {};
  if ("rol" in b) {
    if (!TODOS_LOS_ROLES.includes(b.rol as Rol)) return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
    cambios.rol = b.rol;
  }
  if ("activo" in b) cambios.activo = b.activo === true;
  if ("pos" in b) cambios.permisos = { ...(objetivo.permisos ?? {}), pos: b.pos === true };

  // Nadie puede quitarse a sí mismo el acceso de administrador, y siempre debe quedar al menos uno activo.
  const pierdeAdmin = objetivo.rol === "admin" && objetivo.activo && (cambios.rol && cambios.rol !== "admin" || cambios.activo === false);
  if (pierdeAdmin) {
    if (esUnoMismo) return NextResponse.json({ error: "No puedes quitarte a ti mismo el acceso de administrador" }, { status: 400 });
    const { count } = await db.from("usuarios_admin").select("id", { count: "exact", head: true }).eq("rol", "admin").eq("activo", true);
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "Debe quedar al menos un administrador activo" }, { status: 400 });
  }
  if (esUnoMismo && cambios.activo === false) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: "Nada que cambiar" }, { status: 400 });

  const { data, error: err } = await db.from("usuarios_admin").update(cambios).eq("id", id).select("id, email, nombre, rol, activo, permisos, telefono, created_at").single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json(data);
}
