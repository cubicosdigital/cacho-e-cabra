import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { ROLES_CREABLES, type Rol } from "@/lib/roles";
import { EMAIL_RE } from "@/lib/registro";

// Lista completa de cuentas: solo admin. RLS de usuarios_admin solo deja leer el propio registro,
// así que se valida el rol a mano y se usa el cliente con service key.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getSupabase();
  const [cuentas, empleados] = await Promise.all([
    db.from("usuarios_admin").select("id, email, nombre, rol, activo, permisos, telefono, created_at").order("nombre"),
    db.from("empleados").select("id, nombre, usuario_admin_id").eq("activo", true).order("nombre"),
  ]);
  if (cuentas.error) return NextResponse.json({ error: cuentas.error.message }, { status: 500 });
  return NextResponse.json(cuentas.data.map(c => ({ ...c, empleado: empleados.data?.find(e => e.usuario_admin_id === c.id)?.nombre ?? null })));
}

// Crea una cuenta. Entra con su correo y un código (sin contraseña), o la fija desde Configuración.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const b = await req.json().catch(() => ({}));
  const nombre = String(b.nombre ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const rol = b.rol as Rol;
  const telefono = String(b.telefono ?? "").trim() || null;
  if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "El correo no parece válido" }, { status: 400 });
  if (!ROLES_CREABLES.includes(rol)) return NextResponse.json({ error: "Rol no válido" }, { status: 400 });

  const db = getSupabase();
  const { data: existe } = await db.from("usuarios_admin").select("id").eq("email", email).maybeSingle();
  if (existe) return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });

  if (b.empleado_id) {
    const { data: emp } = await db.from("empleados").select("id, usuario_admin_id").eq("id", b.empleado_id).maybeSingle();
    if (!emp) return NextResponse.json({ error: "El trabajador elegido no existe" }, { status: 404 });
    if (emp.usuario_admin_id) return NextResponse.json({ error: "Ese trabajador ya tiene una cuenta" }, { status: 409 });
  }

  const { error: errAuth } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (errAuth && !/already|registered|exists/i.test(errAuth.message)) return NextResponse.json({ error: errAuth.message }, { status: 500 });

  const { data, error: err } = await db.from("usuarios_admin").insert({ nombre, email, rol, telefono, permisos: {} }).select("id, email, nombre, rol, activo, permisos, telefono, created_at").single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  if (b.empleado_id) await db.from("empleados").update({ usuario_admin_id: data.id }).eq("id", b.empleado_id);
  return NextResponse.json(data);
}
