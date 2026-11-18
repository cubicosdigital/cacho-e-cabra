import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { validarMenu } from "@/lib/menu-dia";
import { actualizarMenu, eliminarMenu, obtenerMenu } from "@/lib/menu-dia-db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("menu", "r");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  try {
    const menu = await obtenerMenu(id);
    if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
    return NextResponse.json(menu);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo leer el menú" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("menu", "u");
  if (g.error) return g.error;

  const v = validarMenu(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const { id } = await ctx.params;
  try {
    const menu = await actualizarMenu(id, v.datos);
    if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
    return NextResponse.json(menu);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo guardar el menú";
    return NextResponse.json({ error: mensaje }, { status: /Ya existe/.test(mensaje) ? 409 : 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("menu", "d");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  try {
    if (!(await eliminarMenu(id))) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo eliminar el menú" }, { status: 500 });
  }
}
