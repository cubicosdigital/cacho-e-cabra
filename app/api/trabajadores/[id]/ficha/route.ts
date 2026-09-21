import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { contratoCompleto, type Ficha } from "@/lib/fichas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, error } = await requireAdmin();
  if (error) return error;

  const { data: empleado } = await db.from("empleados").select("id, nombre, rut, cargo, departamento").eq("id", id).maybeSingle();
  if (!empleado) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
  const { data: ficha } = await db.from("fichas_empleado").select("*").eq("empleado_id", id).maybeSingle();

  return NextResponse.json({ empleado, ficha });
}

// El admin solo edita los datos del contrato; el resto lo completa el trabajador.
const CAMPOS_ADMIN = ["fecha_ingreso", "contrato_duracion", "fecha_termino", "jornada_horas_semanales", "sueldo_base"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const cambios: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_ADMIN) {
    if (campo in body) cambios[campo] = body[campo] === "" ? null : body[campo];
  }

  const { data, error: err } = await db
    .from("fichas_empleado")
    .upsert({ empleado_id: id, ...cambios }, { onConflict: "empleado_id" })
    .select("*")
    .single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  if (contratoCompleto(data as Ficha)) {
    await db.from("notificaciones").update({ leida: true }).eq("empleado_id", id).eq("tipo", "registro").eq("leida", false);
  }
  return NextResponse.json(data);
}
