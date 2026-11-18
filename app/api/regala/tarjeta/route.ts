import { NextResponse } from "next/server";
import { CAMPANA_NAVIDAD, MENSAJE_NAVIDAD_POR_DEFECTO } from "@/lib/giftcards";
import { renderTarjetaPng } from "@/lib/giftcard-render";

/**
 * Imagen de muestra de la gift card navideña para la página pública /regala (y su vista previa al compartir).
 * Es pública y no lee nada de la base: solo dibuja uno de los dos montos de la campaña, con un QR de muestra.
 */
export async function GET(req: Request) {
  const valor = Number(new URL(req.url).searchParams.get("valor")) || CAMPANA_NAVIDAD.montos[0];
  if (!(CAMPANA_NAVIDAD.montos as readonly number[]).includes(valor)) {
    return NextResponse.json({ error: "Monto no válido" }, { status: 400 });
  }

  try {
    const png = await renderTarjetaPng({
      codigo: "000000", tipo: "monto", valor, mensaje: MENSAJE_NAVIDAD_POR_DEFECTO, para: "", vence: CAMPANA_NAVIDAD.vence, tema: "navidad",
    });
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error("regala tarjeta:", e);
    return NextResponse.json({ error: "No se pudo dibujar la tarjeta" }, { status: 500 });
  }
}
