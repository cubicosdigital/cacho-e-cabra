import { NextResponse } from "next/server";
import { obtenerGiftcard } from "@/lib/giftcards-db";
import { renderTarjetaPng } from "@/lib/giftcard-render";
import { pngAPdf } from "@/lib/giftcard-pdf";
import { valorTexto } from "@/lib/giftcards";

/** Descarga la gift card como PDF. Pública por uuid, igual que la imagen. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const g = await obtenerGiftcard(id);
    if (!g) return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });

    const pdf = await pngAPdf(await renderTarjetaPng(g), `Gift Card Cacho Cabra ${g.codigo} ${valorTexto(g.tipo, g.valor)}`);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gift-card-cacho-cabra-${g.codigo}.pdf"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("giftcard pdf:", e);
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
