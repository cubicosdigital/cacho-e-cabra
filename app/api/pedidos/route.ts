import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";

interface ItemInput {
  producto_id?: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mesa, nombre, notas, items } = body as {
    mesa: string; nombre?: string; notas?: string; items: ItemInput[];
  };

  if (!mesa?.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Falta mesa o items del pedido" }, { status: 400 });
  }

  const total = items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const supabase = getSupabase();

  const { data: pedido, error: errPedido } = await supabase
    .from("pedidos")
    .insert({ mesa_numero: mesa.trim(), nombre_cliente: nombre?.trim() || "", notas: notas?.trim() || "", total })
    .select()
    .single();

  if (errPedido) return NextResponse.json({ error: errPedido.message }, { status: 500 });

  const itemRows = items.map(i => ({
    pedido_id: pedido.id,
    producto_id: i.producto_id ?? null,
    nombre: i.nombre,
    categoria: i.categoria,
    cantidad: i.cantidad,
    precio_unitario: i.precio,
  }));

  const { error: errItems } = await supabase.from("items_pedido").insert(itemRows);
  if (errItems) return NextResponse.json({ error: errItems.message }, { status: 500 });

  return NextResponse.json(pedido);
}

export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await db
    .from("pedidos")
    .select("*, items_pedido(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
