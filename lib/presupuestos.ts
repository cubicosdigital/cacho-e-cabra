import { promises as fs } from "fs";
import path from "path";

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

const DB_FILE = path.join(process.cwd(), "data", "presupuestos.json");

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, "[]", "utf-8");
  }
}

export async function getPresupuestos(): Promise<Presupuesto[]> {
  try {
    await ensureDb();
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as Presupuesto[];
    return data.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  } catch {
    return [];
  }
}

export async function savePresupuestos(lista: Presupuesto[]): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify(lista, null, 2), "utf-8");
}

export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  const lista = await getPresupuestos();
  return lista.find(p => p.id === id) ?? null;
}
