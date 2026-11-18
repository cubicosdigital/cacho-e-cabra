import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { FORMATOS_PROMO, renderPromoJpg, type FormatoPromo } from "@/lib/giftcard-promo-render";

/**
 * Gráfica de la campaña navideña para redes sociales, en JPG.
 * ?formato=historia (1080×1920) | post (1080×1350) · &descargar=1 para que el navegador la baje en vez de mostrarla.
 */
export async function GET(req: NextRequest) {
  const g = await requirePermiso("giftcards", "r");
  if (g.error) return g.error;

  const q = new URL(req.url).searchParams;
  const formato = q.get("formato") as FormatoPromo;
  if (!(formato in FORMATOS_PROMO)) return NextResponse.json({ error: "Formato no válido: usa historia o post" }, { status: 400 });

  try {
    const jpg = await renderPromoJpg(formato);
    return new Response(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `${q.get("descargar") ? "attachment" : "inline"}; filename="${FORMATOS_PROMO[formato].archivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("giftcard promo:", e);
    return NextResponse.json({ error: "No se pudo dibujar la gráfica" }, { status: 500 });
  }
}
