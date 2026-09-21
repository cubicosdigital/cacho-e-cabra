import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verificarPuente } from "@/lib/terminal-servidor";

// El puente avisa cada pocos segundos: "sigo vivo, esto veo en el terminal" y recibe las órdenes pendientes.
export async function POST(req: NextRequest) {
  const noAutorizado = verificarPuente(req);
  if (noAutorizado) return noAutorizado;

  const b = await req.json().catch(() => ({}));
  const db = getSupabase();
  // Mientras el puente espera el dedo de alguien, no puede avisar: pide que se lo dé por vivo unos segundos más.
  const extraS = Math.min(Math.max(Number(b.ocupado_s) || 0, 0), 120);
  const ahora = new Date(Date.now() + extraS * 1000).toISOString();

  const fila: Record<string, unknown> = { id: "principal", ultimo_latido: ahora, terminal_ok: b.terminal_ok === true, mensaje: b.mensaje ?? null };
  if (b.terminal_ok === true) {
    Object.assign(fila, {
      ip: b.ip ?? null, serie: b.serie ?? null, firmware: b.firmware ?? null, hora_terminal: b.hora_terminal ?? null,
      usuarios: b.usuarios ?? null, marcaciones: b.marcaciones ?? null,
      usuarios_detalle: Array.isArray(b.usuarios_detalle) ? b.usuarios_detalle.slice(0, 500) : [],
    });
  }
  const { error } = await db.from("terminal_estado").upsert(fila, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (b.solo_latido === true) return NextResponse.json({ ok: true });

  const { data: estado } = await db.from("terminal_estado").select("ultima_marca").eq("id", "principal").maybeSingle();

  const { data: pendientes } = await db.from("terminal_comandos").select("id, tipo, payload").eq("estado", "pendiente").order("created_at").limit(5);
  const comandos = pendientes ?? [];
  if (comandos.length > 0) {
    await db.from("terminal_comandos").update({ estado: "en_proceso" }).in("id", comandos.map(c => c.id)).eq("estado", "pendiente");
  }
  return NextResponse.json({ comandos, ultima_marca: estado?.ultima_marca ?? null });
}
