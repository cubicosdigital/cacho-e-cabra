import { promises as fs } from "fs";
import path from "path";

export interface SlideBanner {
  id: string;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  /** ID de Unsplash, URL completa o ruta a un archivo subido (/uploads/...). */
  imagen: string;
  botonTexto: string;
  botonHref: string;
  activo: boolean;
  orden: number;
}

const DB_FILE = path.join(process.cwd(), "data", "banner.json");

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, "[]", "utf-8");
  }
}

export async function getSlides(): Promise<SlideBanner[]> {
  try {
    await ensureDb();
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as SlideBanner[];
    return data.sort((a, b) => a.orden - b.orden);
  } catch {
    return [];
  }
}

export async function saveSlides(slides: SlideBanner[]): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify(slides, null, 2), "utf-8");
}
