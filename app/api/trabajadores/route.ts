import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { contratoCompleto, type EstadoTrabajador, type Ficha } from "@/lib/fichas";

interface Invitacion { id: string; telefono: string | null; expira_en: string; usada_en: string | null; created_at: string }

export async function GET() {
  const g = await requirePermiso("trabajadores", "r");
  if (g.error) return g.error;
  const db = getSupabase();

  const { data, error: err } = await db
    .from("empleados")
    .select("id, nombre, rut, cargo, departamento, control_asistencia, activo, fecha_baja, motivo_baja, detalle_baja, jornada_tipo, ausencia_tipo, ausencia_desde, ausencia_hasta, fichas_empleado(*), invitaciones(id, telefono, expira_en, usada_en, created_at)")
    .order("nombre");
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const filas = (data ?? []).map(e => {
    const ficha = (Array.isArray(e.fichas_empleado) ? e.fichas_empleado[0] : e.fichas_empleado) as Ficha | null;
    const invitaciones = ((e.invitaciones ?? []) as Invitacion[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const ultima = invitaciones[0] ?? null;

    let estado: EstadoTrabajador = "sin_invitar";
    if (ficha?.registrado_at) estado = contratoCompleto(ficha) ? "completa" : "registrado";
    else if (ultima) estado = new Date(ultima.expira_en) < new Date() ? "vencida" : "invitado";

    return {
      id: e.id, nombre: e.nombre, rut: e.rut, cargo: e.cargo, departamento: e.departamento,
      control_asistencia: e.control_asistencia, activo: e.activo, fecha_baja: e.fecha_baja, motivo_baja: e.motivo_baja, detalle_baja: e.detalle_baja, jornada_tipo: e.jornada_tipo, ausencia_tipo: e.ausencia_tipo, ausencia_desde: e.ausencia_desde, ausencia_hasta: e.ausencia_hasta, estado,
      telefono: ficha?.telefono ?? ultima?.telefono ?? null,
    };
  });

  return NextResponse.json(filas);
}
