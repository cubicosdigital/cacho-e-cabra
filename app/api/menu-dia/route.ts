import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { validarMenu } from "@/lib/menu-dia";
import { crearMenu, listarMenus } from "@/lib/menu-dia-db";

export async function GET() {
  const g = await requirePermiso("menu", "r");
  if (g.error) return g.error;
  try {
    return NextResponse.json(await listarMenus());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudieron leer los menús" }, { status: 500 });
  }
}

/** Crea el menú de un día. */
export async function POST(req: NextRequest) {
  const g = await requirePermiso("menu", "c");
  if (g.error) return g.error;

  const v = validarMenu(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    return NextResponse.json(await crearMenu(v.datos, g.usuario.email), { status: 201 });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo crear el menú";
    return NextResponse.json({ error: mensaje }, { status: /Ya existe/.test(mensaje) ? 409 : 500 });
  }
}
