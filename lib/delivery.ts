import { promises as fs } from "fs";
import path from "path";

export type EstadoDelivery = "recibido" | "preparando" | "en_camino" | "entregado" | "cancelado";

export interface ItemDelivery {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface PedidoDelivery {
  id: string;
  cliente: string;
  telefono: string;
  direccion: string;
  referencia: string;
  items: ItemDelivery[];
  despacho: number;
  notas: string;
  repartidor: string;
  estado: EstadoDelivery;
  /** Total congelado al crear el pedido: si después cambian los precios, la venta no se mueve. */
  total: number;
  created_at: string;
}

export const ESTADOS_DELIVERY: { value: EstadoDelivery; label: string; color: string; next?: EstadoDelivery }[] = [
  { value: "recibido", label: "Recibido", color: "#f05252", next: "preparando" },
  { value: "preparando", label: "Preparando", color: "#FBBF24", next: "en_camino" },
  { value: "en_camino", label: "En camino", color: "#60a5fa", next: "entregado" },
  { value: "entregado", label: "Entregado", color: "#34d399" },
];

export function calcularTotal(items: ItemDelivery[], despacho: number) {
  return items.reduce((s, i) => s + i.cantidad * i.precio, 0) + despacho;
}

const DB_FILE = path.join(process.cwd(), "data", "delivery.json");

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, "[]", "utf-8");
  }
}

export async function getDelivery(): Promise<PedidoDelivery[]> {
  try {
    await ensureDb();
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as PedidoDelivery[];
    return data.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

export async function saveDelivery(lista: PedidoDelivery[]): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify(lista, null, 2), "utf-8");
}
