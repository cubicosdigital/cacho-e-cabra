import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { detalle, revisarSaldo } from "@/lib/pos";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("pos", "r");
  if (g.error) return g.error;
  const d = await detalle(getSupabase(), (await params).id);
  return d ? NextResponse.json(d) : NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
}

// { accion: "cerrar", motivo } deja la cuenta como "con deuda" si falta pagar (el motivo es obligatorio); { accion: "reabrir" } la vuelve a abrir.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("pos", "u");
  if (g.error) return g.error;
  const db = getSupabase();
  const id = (await params).id;
  const b = await req.json().catch(() => ({}));

  const d = await detalle(db, id);
  if (!d) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  if (b.accion === "cerrar") {
    if (d.estado !== "abierta") return NextResponse.json({ error: "La cuenta ya está cerrada" }, { status: 400 });
    if (d.saldo > 0) {
      const motivo = String(b.motivo ?? "").trim().slice(0, 300);
      if (!motivo) return NextResponse.json({ error: "Indica por qué se cierra con saldo pendiente" }, { status: 400 });
      await db.from("cuentas").update({ estado: "con_deuda", cerrada_at: new Date().toISOString(), nota_cierre: motivo }).eq("id", id);
    } else {
      await db.from("cuentas").update({ estado: "pagada", cerrada_at: new Date().toISOString() }).eq("id", id);
    }
  } else if (b.accion === "reabrir") {
    if (d.estado === "abierta") return NextResponse.json({ error: "La cuenta ya está abierta" }, { status: 400 });
    await db.from("cuentas").update({ estado: "abierta", cerrada_at: null, nota_cierre: null }).eq("id", id);
  } else {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }
  return NextResponse.json(await revisarSaldo(db, id));
}
