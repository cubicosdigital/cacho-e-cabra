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

export async function PATCH(req: Request) {
  const { db, error } = await requireAdmin();
  if (error) return error;

  const b = await req.json().catch(() => ({}));
  const ip = String(b.ip_manual ?? "").trim();
  if (ip && !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return NextResponse.json({ error: "Esa no parece una IP válida (ej. 192.168.1.98)" }, { status: 400 });
  }
  const { error: err } = await db.from("terminal_estado").upsert({ id: "principal", ip_manual: ip || null }, { onConflict: "id" });
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
