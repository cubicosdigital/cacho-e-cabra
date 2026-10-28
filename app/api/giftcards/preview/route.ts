import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { datosVistaPrevia } from "@/lib/giftcards";
import { renderTarjetaPng } from "@/lib/giftcard-render";

/** Vista previa mientras se escribe el formulario: dibuja la tarjeta tal como saldrá, sin guardar nada. */
export async function GET(req: NextRequest) {
  const g = await requirePermiso("giftcards", "c");
  if (g.error) return g.error;

  try {
    const png = await renderTarjetaPng(datosVistaPrevia(new URL(req.url).searchParams));
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("giftcard preview:", e);
    return NextResponse.json({ error: "No se pudo dibujar la tarjeta" }, { status: 500 });
  }
}
