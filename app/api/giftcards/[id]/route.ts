import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { fechaCorta, type EstadoGiftcard } from "@/lib/giftcards";
import { cambiarEstadoGiftcard, canjearGiftcard, eliminarGiftcard, obtenerGiftcard } from "@/lib/giftcards-db";

const ESTADOS: EstadoGiftcard[] = ["activa", "canjeada", "anulada"];

/** Una gift card (la usa el lector de QR para mostrar su estado antes de canjearla). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("giftcards", "r");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  try {
    const gift = await obtenerGiftcard(id);
    if (!gift) return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });
    return NextResponse.json(gift);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo leer la gift card" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("giftcards", "u");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const { estado } = (await req.json().catch(() => ({}))) as { estado?: EstadoGiftcard };
  if (!estado || !ESTADOS.includes(estado)) return NextResponse.json({ error: "Estado no válido" }, { status: 400 });

  try {
    // Canjear lleva reglas (activa y no vencida) que se aplican acá, no en la pantalla.
    if (estado === "canjeada") {
      const r = await canjearGiftcard(id);
      if (r.resultado === "ok") return NextResponse.json(r.giftcard);
      if (r.resultado === "no_existe") return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });
      const motivo =
        r.resultado === "ya_canjeada" ? `Esta gift card ya fue canjeada${r.giftcard?.canjeadaEn ? ` el ${fechaCorta(r.giftcard.canjeadaEn)}` : ""}.`
        : r.resultado === "anulada" ? "Esta gift card está anulada."
        : `Esta gift card venció el ${fechaCorta(r.giftcard?.vence)}.`;
      return NextResponse.json({ error: motivo, giftcard: r.giftcard }, { status: 409 });
    }

    const actualizada = await cambiarEstadoGiftcard(id, estado);
    if (!actualizada) return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });
    return NextResponse.json(actualizada);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("giftcards", "d");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  try {
    if (!(await eliminarGiftcard(id))) return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo eliminar" }, { status: 500 });
  }
}
