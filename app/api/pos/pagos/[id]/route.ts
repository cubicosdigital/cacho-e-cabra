import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { detalle } from "@/lib/pos";

// Anula un pago (no se borra: queda el registro con el motivo). Si la cuenta estaba pagada, vuelve a abrirse.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("pos", "d");
  if (g.error) return g.error;
  const db = getSupabase();
  const b = await req.json().catch(() => ({}));
  const motivo = String(b.motivo ?? "").trim().slice(0, 300);
  if (!motivo) return NextResponse.json({ error: "Indica el motivo de la anulación" }, { status: 400 });

  const { data: pago } = await db.from("pagos").select("id, cuenta_id, anulado").eq("id", (await params).id).maybeSingle();
  if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (pago.anulado) return NextResponse.json({ error: "El pago ya estaba anulado" }, { status: 400 });

  await db.from("pagos").update({ anulado: true, anulado_motivo: motivo }).eq("id", pago.id);
  await db.from("cuentas").update({ estado: "abierta", cerrada_at: null }).eq("id", pago.cuenta_id).eq("estado", "pagada");
  return NextResponse.json(await detalle(db, pago.cuenta_id));
}
