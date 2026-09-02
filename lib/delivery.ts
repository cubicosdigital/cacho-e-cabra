import { leerColeccion, reemplazarColeccion, txt, num } from "./coleccion";

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

// ─── Persistencia ──────────────────────────────────────────────────

const TABLA = "delivery_pedidos";

function aDominio(f: Record<string, unknown>): PedidoDelivery {
  return {
    id: String(f.id),
    cliente: txt(f.cliente),
    telefono: txt(f.telefono),
    direccion: txt(f.direccion),
    referencia: txt(f.referencia),
    items: Array.isArray(f.items) ? (f.items as ItemDelivery[]) : [],
    despacho: num(f.despacho),
    notas: txt(f.notas),
    repartidor: txt(f.repartidor),
    estado: txt(f.estado, "recibido") as EstadoDelivery,
    total: num(f.total),
    created_at: txt(f.created_at),
  };
}

function aFila(p: PedidoDelivery): Record<string, unknown> {
  return {
    id: p.id,
    cliente: p.cliente,
    telefono: p.telefono,
    direccion: p.direccion,
    referencia: p.referencia,
    items: p.items,
    despacho: p.despacho,
    notas: p.notas,
    repartidor: p.repartidor,
    estado: p.estado,
    total: p.total,
    created_at: p.created_at,
  };
}

export async function getDelivery(): Promise<PedidoDelivery[]> {
  return leerColeccion(TABLA, { columna: "created_at", ascendente: false }, aDominio);
}

export async function saveDelivery(lista: PedidoDelivery[]): Promise<void> {
  await reemplazarColeccion(TABLA, lista.map(aFila));
}
