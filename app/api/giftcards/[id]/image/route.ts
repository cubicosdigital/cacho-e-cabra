import { NextResponse } from "next/server";
import { obtenerGiftcard } from "@/lib/giftcards-db";
import { renderTarjetaPng } from "@/lib/giftcard-render";

/**
 * Imagen pública de la gift card (la que WhatsApp muestra como vista previa del link).
 * Es pública porque el id es un uuid: solo quien recibió el link la puede pedir.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const g = await obtenerGiftcard(id);
    if (!g) return NextResponse.json({ error: "Gift card no encontrada" }, { status: 404 });

    const png = await renderTarjetaPng(g);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="gift-card-${g.codigo}.png"`,
        // Los datos de una gift card no cambian una vez creada.
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("giftcard image:", e);
    return NextResponse.json({ error: "No se pudo dibujar la tarjeta" }, { status: 500 });
  }
}
