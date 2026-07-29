import { promises as fs } from "fs";
import path from "path";

export interface Registro {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  personas: number;
  evento_id: string;
  fecha_registro: string;
  /** El admin confirma el cupo. */
  confirmado: boolean;
  /** El admin verifica la transferencia a mano y lo marca acá. */
  pagado: boolean;
  created_at: string;
}

const DB_FILE = path.join(process.cwd(), "data", "evento_registros.json");

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify({ registros: [] }, null, 2), "utf-8");
  }
}

export async function getRegistros(): Promise<Registro[]> {
  try {
    await ensureDb();
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(raw) as { registros: Partial<Registro>[] };
    // `pagado` se agregó después, así que los registros viejos vienen sin el campo.
    return (db.registros ?? []).map(r => ({ ...r, pagado: r.pagado ?? false } as Registro));
  } catch {
    return [];
  }
}

export async function saveRegistros(registros: Registro[]): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify({ registros }, null, 2), "utf-8");
}
