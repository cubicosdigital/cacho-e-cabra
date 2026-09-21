import { NextRequest, NextResponse } from "next/server";
import { getEventos, saveEventos, type Evento } from "@/lib/eventos";
import { requirePermiso } from "@/lib/admin-auth";

export async function GET() {
  const eventos = await getEventos();
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("eventos", "c");
  if (g.error) return g.error;

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
