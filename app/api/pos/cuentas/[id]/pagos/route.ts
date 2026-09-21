import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { METODOS, detalle, revisarSaldo, type Metodo } from "@/lib/pos";

// Registra un pago parcial (o total). El monto se descuenta del saldo; cuando llega a cero la cuenta queda pagada.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("pos", "c");
  if (g.error) return g.error;
  const db = getSupabase();
  const id = (await params).id;
  const b = await req.json().catch(() => ({}));

  const d = await detalle(db, id);
  if (!d) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  if (d.estado !== "abierta") return NextResponse.json({ error: "La cuenta está cerrada. Reábrela para cobrar." }, { status: 400 });

  const monto = Math.round(Number(b.monto));
  const propina = Math.max(0, Math.round(Number(b.propina) || 0));
  const metodo = b.metodo as Metodo;
  const pagador = String(b.pagador ?? "").trim().slice(0, 80);
  if (!Number.isFinite(monto) || monto <= 0) return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  if (!METODOS.includes(metodo)) return NextResponse.json({ error: "Método de pago no válido" }, { status: 400 });
  if (monto > d.saldo) return NextResponse.json({ error: `El monto supera lo que falta pagar (${d.saldo})` }, { status: 400 });
  if (metodo === "cortesia" && !pagador) return NextResponse.json({ error: "Para una cortesía o descuento, anota el motivo" }, { status: 400 });

  const items: { item_id: string; cantidad: number }[] = [];
  for (const it of Array.isArray(b.items) ? b.items : []) {
    const linea = d.items.find(x => x.id === it?.item_id);
    const cantidad = Math.round(Number(it?.cantidad));
    if (!linea || !(cantidad > 0)) return NextResponse.json({ error: "Hay un ítem no válido en el pago" }, { status: 400 });
    if (cantidad > linea.cantidad - linea.pagado) return NextResponse.json({ error: `"${linea.nombre}" ya está pagado en esa cantidad` }, { status: 400 });
    items.push({ item_id: linea.id, cantidad });
  }

  const { error } = await db.from("pagos").insert({ cuenta_id: id, monto, propina, metodo, pagador, items, cajero_id: g.usuario.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await revisarSaldo(db, id));
}
