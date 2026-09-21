import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { db, error } = await requireAdmin();
  if (error) return error;

  // Órdenes que nadie tomó o que el puente dejó a medias: se cierran para que no queden colgadas.
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  await db.from("terminal_comandos").update({ estado: "error", resultado: "Caducó: el puente no la tomó (¿está encendido?)", ejecutado_at: new Date().toISOString() })
    .eq("estado", "pendiente").lt("created_at", hace(10));
  await db.from("terminal_comandos").update({ estado: "error", resultado: "El puente no respondió a tiempo", ejecutado_at: new Date().toISOString() })
    .eq("estado", "en_proceso").lt("created_at", hace(5));

  const [estado, comandos, empleados] = await Promise.all([
    db.from("terminal_estado").select("*").eq("id", "principal").maybeSingle(),
    db.from("terminal_comandos").select("*").order("created_at", { ascending: false }).limit(15),
    db.from("empleados").select("id, nombre, cargo, zk_id, control_asistencia").eq("activo", true).order("nombre"),
  ]);
  if (estado.error || comandos.error || empleados.error) {
    return NextResponse.json({ error: (estado.error ?? comandos.error ?? empleados.error)!.message }, { status: 500 });
  }
  return NextResponse.json({ estado: estado.data, comandos: comandos.data, empleados: empleados.data, ahora: new Date().toISOString() });
}
