import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { adjuntarPedidos, detalles, detalle } from "@/lib/pos";

// Panel del POS: cuentas abiertas, cuentas cerradas con deuda y mesas con pedidos que aún no se cobran.
export async function GET() {
  const g = await requirePermiso("pos", "r");
  if (g.error) return g.error;
  const db = getSupabase();

  const { data: abiertas } = await db.from("cuentas").select("*").eq("estado", "abierta").order("abierta_at");
  await adjuntarPedidos(db, (abiertas ?? []).map(c => ({ id: c.id, mesa: c.mesa })));
  const hace30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: deuda } = await db.from("cuentas").select("*").eq("estado", "con_deuda").gte("abierta_at", hace30).order("abierta_at", { ascending: false });

  const todas = await detalles(db, [...(abiertas ?? []), ...(deuda ?? [])]);
  const quitarDetalle = ({ items: _i, pagos: _p, ...resumen }: (typeof todas)[number]) => resumen; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Pedidos sin cuenta (últimas 48 h), agrupados por mesa.
  const desde = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: sueltos } = await db.from("pedidos").select("id, mesa_numero, total, created_at").is("cuenta_id", null).gte("created_at", desde).order("created_at");
  const porMesa = new Map<string, { mesa: string; pedidos: number; total: number; desde: string }>();
  for (const p of sueltos ?? []) {
    const m = porMesa.get(p.mesa_numero) ?? { mesa: p.mesa_numero, pedidos: 0, total: 0, desde: p.created_at };
    m.pedidos += 1; m.total += p.total; porMesa.set(p.mesa_numero, m);
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const { data: pagosHoy } = await db.from("pagos").select("monto, propina, metodo").eq("anulado", false).gte("created_at", hoy.toISOString());
  const cobradoHoy = (pagosHoy ?? []).filter(p => p.metodo !== "cortesia").reduce((s, p) => s + p.monto, 0);
  const propinasHoy = (pagosHoy ?? []).reduce((s, p) => s + p.propina, 0);

  return NextResponse.json({
    abiertas: todas.filter(c => c.estado === "abierta").map(quitarDetalle),
    conDeuda: todas.filter(c => c.estado === "con_deuda").map(quitarDetalle),
    porAbrir: [...porMesa.values()],
    cobradoHoy, propinasHoy,
  });
}

// Abre la cuenta de una mesa y le suma sus pedidos pendientes. Si ya hay una abierta, devuelve esa.
export async function POST(req: NextRequest) {
  const g = await requirePermiso("pos", "c");
  if (g.error) return g.error;
  const db = getSupabase();

  const b = await req.json().catch(() => ({}));
  const mesa = String(b.mesa ?? "").trim().slice(0, 40);
  if (!mesa) return NextResponse.json({ error: "Indica la mesa" }, { status: 400 });

  const { data: existente } = await db.from("cuentas").select("id").eq("mesa", mesa).eq("estado", "abierta").maybeSingle();
  let id = existente?.id as string | undefined;
  if (!id) {
    const { data, error } = await db.from("cuentas").insert({ mesa, abierta_por: g.usuario.id }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    id = data.id;
  }
  const d = await detalle(db, id!);
  if (!d || (d.n_pedidos === 0 && !existente)) {
    if (!existente && d) await db.from("cuentas").delete().eq("id", id!);
    return NextResponse.json({ error: `La mesa ${mesa} no tiene pedidos por cobrar en las últimas 48 horas` }, { status: 400 });
  }
  return NextResponse.json(d);
}
