import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSlides, saveSlides } from "@/lib/banner";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const patch = await req.json();
  const slides = await getSlides();
  const idx = slides.findIndex(s => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Slide no encontrado" }, { status: 404 });

  slides[idx] = { ...slides[idx], ...patch, id };
  await saveSlides(slides);
  return NextResponse.json(slides[idx]);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const slides = await getSlides();
  const restantes = slides.filter(s => s.id !== id);
  if (restantes.length === slides.length) {
    return NextResponse.json({ error: "Slide no encontrado" }, { status: 404 });
  }

  // Se reordena para que no queden huecos en el orden.
  await saveSlides(restantes.map((s, i) => ({ ...s, orden: i })));
  return NextResponse.json({ ok: true });
}
