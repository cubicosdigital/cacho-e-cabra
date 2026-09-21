import { NextRequest, NextResponse } from "next/server";
import { getSlides, saveSlides, type SlideBanner } from "@/lib/banner";
import { requirePermiso } from "@/lib/admin-auth";

export async function GET() {
  return NextResponse.json(await getSlides());
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("banner", "c");
  if (g.error) return g.error;

  const body = await req.json();
  if (!body.titulo?.trim()) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const slides = await getSlides();
  const nuevo: SlideBanner = {
    id: crypto.randomUUID(),
    etiqueta: body.etiqueta?.trim() ?? "",
    titulo: body.titulo.trim(),
    descripcion: body.descripcion?.trim() ?? "",
    imagen: body.imagen?.trim() ?? "",
    botonTexto: body.botonTexto?.trim() || "Ver más",
    botonHref: body.botonHref?.trim() || "/carta",
    activo: body.activo !== false,
    orden: slides.length,
  };

  await saveSlides([...slides, nuevo]);
  return NextResponse.json(nuevo);
}
