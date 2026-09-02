import { leerColeccion, leerFila, reemplazarColeccion, txt, num, bool } from "./coleccion";

export type TipoEvento = "cocina" | "cena" | "fiesta" | "aniversario" | "privado";
export type EstadoEvento = "abierto" | "privado" | "invitacion";

export interface Evento {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  fecha: string;
  fechaCorta: string;
  mes: string;
  hora: string;
  duracion: string;
  precio: number;
  cupos: number;
  registrados: number;
  emoji: string;
  subtitulo: string;
  descripcion: string;
  detalles: string[];
  imagen: string;
  estado: EstadoEvento;
  destacado: boolean;
  publicado: boolean;
  orden: number;
  chef?: string;
  promo?: { texto: string; precio: number };
  lugar?: string;
  gastronomia?: string;
  experiencia?: string;
}

export const TIPOS: TipoEvento[] = ["cocina", "cena", "fiesta", "aniversario", "privado"];
export const ESTADOS: EstadoEvento[] = ["abierto", "privado", "invitacion"];

export const TIPO_META: Record<TipoEvento, { label: string; color: string }> = {
  cocina: { label: "👨‍🍳 Cocina", color: "#f97316" },
  cena: { label: "🕯️ Cena", color: "#8b5cf6" },
  fiesta: { label: "🎉 Fiesta", color: "#ec4899" },
  aniversario: { label: "🎂 Aniversario", color: "#06b6d4" },
  privado: { label: "🎪 Privado", color: "#6366f1" },
};

export const ESTADO_META: Record<EstadoEvento, string> = {
  abierto: "Entrada abierta",
  privado: "Evento privado",
  invitacion: "Solo con invitación",
};

export function fmtPrecio(n: number) {
  return n === 0 ? "Liberado" : `$${n.toLocaleString("es-CL")}`;
}

// ─── Persistencia ──────────────────────────────────────────────────
// Tabla `eventos`. El id es text para conservar los ids originales ("1".."9")
// que ya estaban en circulación y que evento_registros.evento_id referencia.

const TABLA = "eventos";

function aDominio(f: Record<string, unknown>): Evento {
  const promo = f.promo as { texto?: string; precio?: number } | null;
  return {
    id: String(f.id),
    titulo: txt(f.titulo),
    tipo: txt(f.tipo, "fiesta") as TipoEvento,
    fecha: txt(f.fecha),
    fechaCorta: txt(f.fecha_corta),
    mes: txt(f.mes),
    hora: txt(f.hora, "20:00"),
    duracion: txt(f.duracion),
    precio: num(f.precio),
    cupos: num(f.cupos),
    registrados: num(f.registrados),
    emoji: txt(f.emoji, "🎉"),
    subtitulo: txt(f.subtitulo),
    descripcion: txt(f.descripcion),
    detalles: Array.isArray(f.detalles) ? (f.detalles as string[]) : [],
    imagen: txt(f.imagen),
    estado: txt(f.estado, "abierto") as EstadoEvento,
    destacado: bool(f.destacado),
    publicado: bool(f.publicado),
    orden: num(f.orden),
    chef: (f.chef as string) ?? undefined,
    promo: promo ? { texto: promo.texto ?? "", precio: Number(promo.precio) || 0 } : undefined,
    lugar: (f.lugar as string) ?? undefined,
    gastronomia: (f.gastronomia as string) ?? undefined,
    experiencia: (f.experiencia as string) ?? undefined,
  };
}

function aFila(e: Evento): Record<string, unknown> {
  return {
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    fecha: e.fecha,
    fecha_corta: e.fechaCorta,
    mes: e.mes,
    hora: e.hora,
    duracion: e.duracion,
    precio: e.precio,
    cupos: e.cupos,
    registrados: e.registrados,
    emoji: e.emoji,
    subtitulo: e.subtitulo,
    descripcion: e.descripcion,
    detalles: e.detalles,
    imagen: e.imagen,
    estado: e.estado,
    destacado: e.destacado,
    publicado: e.publicado,
    orden: e.orden,
    chef: e.chef ?? null,
    promo: e.promo ?? null,
    lugar: e.lugar ?? null,
    gastronomia: e.gastronomia ?? null,
    experiencia: e.experiencia ?? null,
  };
}

export async function getEventos(): Promise<Evento[]> {
  return leerColeccion(TABLA, { columna: "orden", ascendente: true }, aDominio);
}

export async function saveEventos(eventos: Evento[]): Promise<void> {
  await reemplazarColeccion(TABLA, eventos.map(aFila));
}

export async function getEvento(id: string): Promise<Evento | null> {
  return leerFila(TABLA, id, aDominio);
}
