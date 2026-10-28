import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { obtenerLote } from "@/lib/giftcards-db";
import { rangoCodigos } from "@/lib/giftcards";
import { renderTarjetaPng } from "@/lib/giftcard-render";
import { hojaDeTarjetasPdf } from "@/lib/giftcard-pdf";

/**
 * PDF para imprimir y recortar con todas las gift cards de un lote, en orden correlativo.
 * A diferencia del PDF de una sola tarjeta, este NO es público: solo lo baja el personal.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ lote: string }> }) {
  const g = await requirePermiso("giftcards", "r");
  if (g.error) return g.error;

  const { lote } = await ctx.params;
  try {
    const tarjetas = await obtenerLote(lote);
    if (tarjetas.length === 0) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });

    const rango = rangoCodigos(tarjetas);
    const pngs: Buffer[] = [];
    for (const t of tarjetas) pngs.push(await renderTarjetaPng(t));

    const pdf = await hojaDeTarjetasPdf(pngs, `Gift Cards Cacho Cabra ${rango.replace("–", "a")}`);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gift-cards-${rango.replace(/\s*–\s*/, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("giftcard lote pdf:", e);
    return NextResponse.json({ error: "No se pudo generar el PDF del lote" }, { status: 500 });
  }
}
