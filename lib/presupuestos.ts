import { leerColeccion, leerFila, reemplazarColeccion, txt, num } from "./coleccion";

export type EstadoPresupuesto = "borrador" | "enviado" | "aceptado" | "rechazado";

/** Un bloque del presupuesto: un título grande y bajo él uno o más grupos de líneas. */
export interface Bloque {
  titulo: string;
  grupos: { subtitulo: string; lineas: string[] }[];
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

export const INTRO_POR_DEFECTO =
  "Estimado cliente, gracias por su interés en nuestros servicios, adjuntamos el presupuesto correspondiente a su solicitud. Si tiene alguna pregunta o necesita más información, no dude en ponerse en contacto con nosotros.";

/** Plantilla del Buffet de Asado Premium, que es el presupuesto base de la casa. */
export const PLANTILLA_ASADO: Bloque[] = [
  {
    titulo: "Buffet de Asado Premium",
    grupos: [
      { subtitulo: "4 cortes de carne:", lineas: ["Vacuno, Malaya, Costillar, Pollo."] },
      {
        subtitulo: "Buffet de ensaladas",
        lineas: [
          "Ensalada chilena, Lechuga surtida, Ensalada de papas con mayonesa.",
          "Coleslaw, Arroz primavera.",
        ],
      },
      {
        subtitulo: "Pan, Salsas y acompañamientos:",
        lineas: ["Pebre, chimichurri, salsa criolla y mayonesa casera."],
      },
    ],
  },
  {
    titulo: "El servicio incluye",
    grupos: [
      {
        subtitulo: "",
        lineas: [
          "- Parrillero Profesional",
          "- Montaje del buffet",
          "- Mantención y reposición de ensaladas durante el servicio",
        ],
      },
      {
        subtitulo: "Considerar 2 tragos de la carta a elección:",
        lineas: ["- Shop de cerveza", "- Coctelería", "- Destilado"],
      },
    ],
  },
];

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
