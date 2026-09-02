import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, email, telefono } = body as {
    nombre?: string; email: string; telefono: string;
  };

  if (!email?.trim() || !telefono?.trim()) {
    return NextResponse.json({ error: "Falta email o teléfono" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: cliente, error: errCliente } = await supabase
    .from("clientes")
    .insert({
      nombre: nombre?.trim() || "Cliente",
      email: email.trim(),
      telefono: telefono.trim()
    })
    .select()
    .single();

  if (errCliente) return NextResponse.json({ error: errCliente.message }, { status: 500 });

  return NextResponse.json(cliente);
}
