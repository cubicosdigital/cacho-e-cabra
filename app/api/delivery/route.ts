import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getDelivery, saveDelivery, calcularTotal, type PedidoDelivery, type ItemDelivery } from "@/lib/delivery";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json(await getDelivery());
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  if (!body.cliente?.trim() || !body.direccion?.trim()) {
    return NextResponse.json({ error: "Cliente y dirección son obligatorios" }, { status: 400 });
  }

  const items: ItemDelivery[] = Array.isArray(body.items)
    ? body.items
        .filter((i: ItemDelivery) => i.nombre?.trim() && i.cantidad > 0)
        .map((i: ItemDelivery) => ({
          nombre: String(i.nombre).trim(),
          cantidad: Number(i.cantidad) || 1,
          precio: Number(i.precio) || 0,
        }))
    : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "El pedido necesita al menos un producto" }, { status: 400 });
  }

  const despacho = Number(body.despacho) || 0;
  const lista = await getDelivery();
  const nuevo: PedidoDelivery = {
    id: crypto.randomUUID(),
    cliente: body.cliente.trim(),
    telefono: body.telefono?.trim() ?? "",
    direccion: body.direccion.trim(),
    referencia: body.referencia?.trim() ?? "",
    items,
    despacho,
    notas: body.notas?.trim() ?? "",
    repartidor: body.repartidor?.trim() ?? "",
    estado: "recibido",
    total: calcularTotal(items, despacho),
    created_at: new Date().toISOString(),
  };

  await saveDelivery([nuevo, ...lista]);
  return NextResponse.json(nuevo);
}
