import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getEventos, saveEventos, type Evento } from "@/lib/eventos";

async function requireAdmin() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return user;
}

export async function GET() {
  const eventos = await getEventos();
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  if (!body.titulo?.trim()) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const eventos = await getEventos();
  const nuevo: Evento = {
    id: Date.now().toString(),
    titulo: body.titulo.trim(),
    tipo: body.tipo ?? "fiesta",
    fecha: body.fecha ?? "",
    fechaCorta: body.fechaCorta ?? "",
    mes: body.mes ?? "",
    hora: body.hora ?? "20:00",
    duracion: body.duracion ?? "",
    precio: Number(body.precio) || 0,
    cupos: Number(body.cupos) || 0,
    registrados: 0,
    emoji: body.emoji ?? "🎉",
    subtitulo: body.subtitulo ?? "",
    descripcion: body.descripcion ?? "",
    detalles: Array.isArray(body.detalles) ? body.detalles : [],
    imagen: body.imagen ?? "photo-1530103862676-de8c9debad1d",
    estado: body.estado ?? "abierto",
    destacado: Boolean(body.destacado),
    publicado: body.publicado !== false,
    orden: eventos.length,
    lugar: body.lugar ?? "Cacho Cabra, Plaza de Llolleo",
    gastronomia: body.gastronomia,
    experiencia: body.experiencia,
  };

  await saveEventos([...eventos, nuevo]);
  return NextResponse.json(nuevo);
}
