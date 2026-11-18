import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { PLATOS_MAX, validarMenu } from "@/lib/menu-dia";
import { nombreArchivo, renderLaminaJpg, renderPaqueteZip, type Lamina } from "@/lib/menu-dia-render";

/**
 * Dibuja el menú que se está editando (aunque todavía no esté guardado): vista previa y descargas del admin.
 * body: { menu, lamina: "historia" | "portada" | { plato: n } | "zip", descargar?: boolean }
 * Responde un JPG, o un ZIP con la historia y todo el carrusel.
 */
export async function POST(req: NextRequest) {
  const g = await requirePermiso("menu", "r");
  if (g.error) return g.error;

  const body = (await req.json().catch(() => null)) as { menu?: unknown; lamina?: unknown; descargar?: unknown } | null;
  const v = validarMenu(body?.menu);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const cabeceras = (tipo: string, archivo: string) => ({
    "Content-Type": tipo,
    "Content-Disposition": `${body?.descargar ? "attachment" : "inline"}; filename="${archivo}"`,
    "Cache-Control": "no-store",
  });

  try {
    if (body?.lamina === "zip") {
      const zip = await renderPaqueteZip(v.datos);
      return new Response(new Uint8Array(zip), { headers: cabeceras("application/zip", `menu-${v.datos.fecha}-redes.zip`) });
    }

    let lamina: Lamina;
    const l = body?.lamina;
    if (l === "historia" || l === "portada") lamina = { tipo: l };
    else if (l && typeof l === "object" && Number.isInteger((l as { plato?: unknown }).plato)) lamina = { tipo: "plato", n: (l as { plato: number }).plato };
    else return NextResponse.json({ error: "Lámina no válida" }, { status: 400 });

    if (lamina.tipo === "plato" && (lamina.n < 1 || lamina.n > Math.min(PLATOS_MAX, v.datos.platos.length))) {
      return NextResponse.json({ error: "Ese plato no existe en el menú" }, { status: 400 });
    }

    const jpg = await renderLaminaJpg(v.datos, lamina);
    return new Response(new Uint8Array(jpg), { headers: cabeceras("image/jpeg", nombreArchivo(v.datos, lamina)) });
  } catch (e) {
    console.error("menu-dia render:", e);
    return NextResponse.json({ error: "No se pudo dibujar la gráfica" }, { status: 500 });
  }
}
