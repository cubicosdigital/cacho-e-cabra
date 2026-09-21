import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";

const CAMPOS = ["nombre", "telefono", "rut", "direccion", "comuna", "fecha_nacimiento", "contacto_emergencia_nombre", "contacto_emergencia_telefono"] as const;
const SELECT = "id, email, nombre, rol, activo, permisos, telefono, rut, direccion, comuna, fecha_nacimiento, contacto_emergencia_nombre, contacto_emergencia_telefono";

async function yo() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function GET() {
  const user = await yo();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data, error } = await getSupabase().from("usuarios_admin").select(SELECT).eq("email", user.email!).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Tu cuenta no está habilitada" }, { status: 403 });
  return NextResponse.json(data);
}

// Cada persona edita solo su propia información. El correo y el rol no se cambian desde aquí.
export async function PATCH(req: NextRequest) {
  const user = await yo();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cambios: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    if (!(campo in body)) continue;
    const v = typeof body[campo] === "string" ? body[campo].trim().slice(0, 200) : "";
    if (campo === "nombre") { if (!v) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 }); cambios[campo] = v; }
    else if (campo === "fecha_nacimiento") cambios[campo] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    else cambios[campo] = v === "" ? null : v;
  }
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: "Nada que guardar" }, { status: 400 });

  const { data, error } = await getSupabase().from("usuarios_admin").update(cambios).eq("email", user.email!).select(SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
