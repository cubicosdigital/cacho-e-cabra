import { leerColeccion, leerFila, reemplazarColeccion, txt, num } from "./coleccion";

export type EstadoPresupuesto = "borrador" | "enviado" | "aceptado" | "rechazado";

/** Un bloque del presupuesto: un título grande y bajo él uno o más grupos de líneas. */
export interface Bloque {
  titulo: string;
  grupos: { subtitulo: string; lineas: string[] }[];
}

/** Una línea de cobro adicional: descripción, cantidad y precio unitario. */
export interface ItemPresupuesto {
  descripcion: string;
  cantidad: number;
  precio: number;
}

/** Punto de partida guardado en la base de datos para crear presupuestos. */
export interface Plantilla {
  id: string;
  nombre: string;
  intro: string;
  bloques: Bloque[];
  items: ItemPresupuesto[];
  notas: string;
  precioPorPersona: number;
}

export interface Presupuesto {
  id: string;
  /** Nombre interno para encontrarlo en el listado. */
  referencia: string;
  cliente: string;
  telefono: string;
  email: string;
  precioPorPersona: number;
  personas: number;
  intro: string;
  bloques: Bloque[];
  items: ItemPresupuesto[];
  notas: string;
  estado: EstadoPresupuesto;
  creadoEn: string;
}

export const ESTADOS: EstadoPresupuesto[] = ["borrador", "enviado", "aceptado", "rechazado"];

export const ESTADO_META: Record<EstadoPresupuesto, { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: "#b0a89f", bg: "#433f3a" },
  enviado: { label: "Enviado", color: "#FBBF24", bg: "#3a2f10" },
  aceptado: { label: "Aceptado", color: "#34d399", bg: "#1a2e1a" },
  rechazado: { label: "Rechazado", color: "#fca5a5", bg: "#2a1212" },
};

/** Total: servicio por persona + todas las líneas adicionales. */
export function totalPresupuesto(p: Pick<Presupuesto, "precioPorPersona" | "personas" | "items">) {
  return p.precioPorPersona * p.personas + subtotalItems(p.items);
}

export function subtotalItems(items: ItemPresupuesto[]) {
  return items.reduce((s, i) => s + i.cantidad * i.precio, 0);
}

/** Deja solo líneas válidas, con números enteros y texto recortado. */
export function limpiarItems(entrada: unknown): ItemPresupuesto[] {
  if (!Array.isArray(entrada)) return [];
  return entrada
    .map((i: Record<string, unknown>) => ({
      descripcion: String(i?.descripcion ?? "").trim().slice(0, 200),
      cantidad: Math.max(0, Math.round(Number(i?.cantidad) || 0)),
      precio: Math.max(0, Math.round(Number(i?.precio) || 0)),
    }))
    .filter(i => i.descripcion)
    .slice(0, 50);
}

/** Fila de la tabla plantillas_presupuesto a partir de lo que llega del formulario. */
export function aFilaPlantilla(b: Record<string, unknown>) {
  return {
    nombre: String(b.nombre ?? "").trim().slice(0, 120),
    intro: String(b.intro ?? ""),
    bloques: Array.isArray(b.bloques) ? b.bloques : [],
    items: limpiarItems(b.items),
    notas: String(b.notas ?? ""),
    precio_por_persona: Math.max(0, Math.round(Number(b.precioPorPersona ?? b.precio_por_persona) || 0)),
  };
}

export function fmtPeso(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

// ─── Persistencia ──────────────────────────────────────────────────
// Tabla `presupuestos`. El id es uuid: el presupuesto se comparte por link
// público en /presupuesto/[id], así que no debe poder adivinarse.

const TABLA = "presupuestos";

function aDominio(f: Record<string, unknown>): Presupuesto {
  return {
    id: String(f.id),
    referencia: txt(f.referencia),
    cliente: txt(f.cliente),
    telefono: txt(f.telefono),
    email: txt(f.email),
    precioPorPersona: num(f.precio_por_persona),
    personas: num(f.personas),
    intro: txt(f.intro),
    bloques: Array.isArray(f.bloques) ? (f.bloques as Bloque[]) : [],
    items: Array.isArray(f.items) ? (f.items as ItemPresupuesto[]) : [],
    notas: txt(f.notas),
    estado: txt(f.estado, "borrador") as EstadoPresupuesto,
    creadoEn: txt(f.creado_en),
  };
}

function aFila(p: Presupuesto): Record<string, unknown> {
  return {
    id: p.id,
    referencia: p.referencia,
    cliente: p.cliente,
    telefono: p.telefono,
    email: p.email,
    precio_por_persona: p.precioPorPersona,
    personas: p.personas,
    intro: p.intro,
    bloques: p.bloques,
    items: p.items,
    notas: p.notas,
    estado: p.estado,
    creado_en: p.creadoEn,
  };
}

export async function getPresupuestos(): Promise<Presupuesto[]> {
  return leerColeccion(TABLA, { columna: "creado_en", ascendente: false }, aDominio);
}

export async function savePresupuestos(lista: Presupuesto[]): Promise<void> {
  await reemplazarColeccion(TABLA, lista.map(aFila));
}

export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  return leerFila(TABLA, id, aDominio);
}
