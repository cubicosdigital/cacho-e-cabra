import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getDelivery, saveDelivery } from "@/lib/delivery";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const lista = await getDelivery();
  const idx = lista.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  // El total no se recalcula: quedó congelado al crear el pedido.
  const actualizado = {
    ...lista[idx],
    ...(body.estado ? { estado: body.estado } : {}),
    ...(typeof body.repartidor === "string" ? { repartidor: body.repartidor } : {}),
    ...(typeof body.notas === "string" ? { notas: body.notas } : {}),
  };
  lista[idx] = actualizado;
  await saveDelivery(lista);
  return NextResponse.json(actualizado);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const lista = await getDelivery();
  const restantes = lista.filter(p => p.id !== id);
  if (restantes.length === lista.length) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  await saveDelivery(restantes);
  return NextResponse.json({ ok: true });
}
