import { NextRequest, NextResponse } from "next/server";
import { getPresupuestos, savePresupuestos } from "@/lib/presupuestos";
import { requirePermiso } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("presupuestos", "u");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const patch = await req.json();
  const lista = await getPresupuestos();
  const idx = lista.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

  const actualizado = { ...lista[idx], ...patch, id, creadoEn: lista[idx].creadoEn };
  lista[idx] = actualizado;
  await savePresupuestos(lista);
  return NextResponse.json(actualizado);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requirePermiso("presupuestos", "d");
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const lista = await getPresupuestos();
  const restantes = lista.filter(p => p.id !== id);
  if (restantes.length === lista.length) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  await savePresupuestos(restantes);
  return NextResponse.json({ ok: true });
}
