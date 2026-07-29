import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSlides, saveSlides, type SlideBanner } from "@/lib/banner";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function GET() {
  return NextResponse.json(await getSlides());
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
