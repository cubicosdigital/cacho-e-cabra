import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getRegistros, crearRegistro } from "@/lib/registros";

/** Público: cualquiera puede inscribirse a un evento desde la web. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, personas, eventoId } = body;

    if (!nombre || !email || !telefono || !personas || !eventoId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    await crearRegistro({
      nombre: String(nombre).trim(),
      email: String(email).trim(),
      telefono: String(telefono).trim(),
      personas: parseInt(personas, 10) || 1,
      evento_id: String(eventoId),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** Privado: la lista trae datos de contacto de los inscritos. */
export async function GET() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  return NextResponse.json({ registros: await getRegistros() });
}
