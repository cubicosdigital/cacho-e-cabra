import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { PLATOS_MAX, platosLimpios } from "@/lib/menu-dia";
import { obtenerMenu } from "@/lib/menu-dia-db";
import { nombreArchivo, renderLaminaJpg, type Lamina } from "@/lib/menu-dia-render";

/**
 * Gráfica de un menú guardado, en JPG: ?tipo=historia | portada | plato&n=1.
 * Los menús publicados son públicos (es lo que muestra la web y lo que ve WhatsApp al compartir);
 * uno en borrador solo lo puede pedir quien tenga acceso al admin.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = new URL(req.url).searchParams;

  try {
    const menu = await obtenerMenu(id);
    if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });

    if (!menu.publicado) {
      const g = await requirePermiso("menu", "r");
      if (g.error) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
    }

    const tipo = q.get("tipo") ?? "historia";
    let lamina: Lamina;
    if (tipo === "historia" || tipo === "portada") lamina = { tipo };
    else if (tipo === "plato") {
      const n = Number(q.get("n"));
      if (!Number.isInteger(n) || n < 1 || n > Math.min(PLATOS_MAX, platosLimpios(menu.platos).length)) {
        return NextResponse.json({ error: "Ese plato no existe en el menú" }, { status: 404 });
      }
      lamina = { tipo: "plato", n };
    } else return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });

    const jpg = await renderLaminaJpg(menu, lamina);
    return new Response(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="${nombreArchivo(menu, lamina)}"`,
        // Quien arma el link agrega ?v=<última edición>, así un cambio se ve de inmediato.
        "Cache-Control": menu.publicado ? "public, max-age=3600" : "private, no-store",
      },
    });
  } catch (e) {
    console.error("menu-dia imagen:", e);
    return NextResponse.json({ error: "No se pudo dibujar la gráfica" }, { status: 500 });
  }
}
