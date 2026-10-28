import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { validarNueva } from "@/lib/giftcards";
import { crearGiftcards, listarGiftcards } from "@/lib/giftcards-db";

export async function GET() {
  const g = await requirePermiso("giftcards", "r");
  if (g.error) return g.error;
  try {
    return NextResponse.json(await listarGiftcards());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudieron leer las gift cards" }, { status: 500 });
  }
}

/** Crea una gift card o un lote ({ cantidad }) con números correlativos. */
export async function POST(req: NextRequest) {
  const g = await requirePermiso("giftcards", "c");
  if (g.error) return g.error;

  const v = validarNueva(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const tarjetas = await crearGiftcards(v.datos, g.usuario.email);
    return NextResponse.json({ tarjetas, lote: tarjetas[0]?.lote ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo crear la gift card" }, { status: 500 });
  }
}
