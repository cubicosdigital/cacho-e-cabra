import type { SupabaseClient } from "@supabase/supabase-js";

export const METODOS = ["efectivo", "debito", "credito", "transferencia", "cortesia"] as const;
export type Metodo = (typeof METODOS)[number];
export const METODO_LABEL: Record<Metodo, string> = {
  efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia", cortesia: "Cortesía / descuento",
};

/** Minutos que una cuenta abierta con saldo pendiente puede estar así antes de dar alerta. */
export const MINUTOS_ALERTA = 90;

export interface ItemCuenta { id: string; pedido_id: string; nombre: string; cantidad: number; precio_unitario: number; pagado: number }
export interface PagoCuenta {
  id: string; cuenta_id: string; monto: number; propina: number; metodo: Metodo; pagador: string;
  items: { item_id: string; cantidad: number }[]; anulado: boolean; anulado_motivo: string | null; created_at: string;
}
export interface Resumen {
  id: string; mesa: string; estado: "abierta" | "pagada" | "con_deuda"; abierta_at: string; cerrada_at: string | null; nota_cierre: string | null;
  total: number; pagado: number; saldo: number; minutos: number; n_pedidos: number;
}
export interface Detalle extends Resumen { items: ItemCuenta[]; pagos: PagoCuenta[] }

type Fila = Record<string, unknown>;
const ahoraMin = (desde: string) => Math.max(0, Math.round((Date.now() - Date.parse(desde)) / 60000));

/** Los pedidos que hicieron desde esa mesa y aún no tienen cuenta se suman a la cuenta abierta. */
export async function adjuntarPedidos(db: SupabaseClient, cuentas: { id: string; mesa: string }[]) {
  const desde = new Date(Date.now() - 48 * 3600_000).toISOString();
  for (const c of cuentas) {
    await db.from("pedidos").update({ cuenta_id: c.id }).is("cuenta_id", null).eq("mesa_numero", c.mesa).gte("created_at", desde);
  }
}

async function cargarTodo(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return { pedidos: [] as Fila[], items: [] as Fila[], pagos: [] as Fila[] };
  const [pedidos, pagos] = await Promise.all([
    db.from("pedidos").select("id, cuenta_id").in("cuenta_id", ids),
    db.from("pagos").select("*").in("cuenta_id", ids).order("created_at"),
  ]);
  const pedidoIds = (pedidos.data ?? []).map(p => p.id as string);
  const items = pedidoIds.length ? (await db.from("items_pedido").select("id, pedido_id, nombre, cantidad, precio_unitario").in("pedido_id", pedidoIds)).data ?? [] : [];
  return { pedidos: (pedidos.data ?? []) as Fila[], items: items as Fila[], pagos: (pagos.data ?? []) as Fila[] };
}

function armar(c: Fila, todo: Awaited<ReturnType<typeof cargarTodo>>): Detalle {
  const idsPedidos = new Set(todo.pedidos.filter(p => p.cuenta_id === c.id).map(p => p.id as string));
  const pagos = todo.pagos.filter(p => p.cuenta_id === c.id) as unknown as PagoCuenta[];
  const validos = pagos.filter(p => !p.anulado);
  const pagadoPorItem = new Map<string, number>();
  for (const p of validos) for (const it of p.items ?? []) pagadoPorItem.set(it.item_id, (pagadoPorItem.get(it.item_id) ?? 0) + it.cantidad);
  const items: ItemCuenta[] = todo.items.filter(i => idsPedidos.has(i.pedido_id as string)).map(i => ({
    id: i.id as string, pedido_id: i.pedido_id as string, nombre: i.nombre as string, cantidad: i.cantidad as number,
    precio_unitario: i.precio_unitario as number, pagado: pagadoPorItem.get(i.id as string) ?? 0,
  }));
  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const pagado = validos.reduce((s, p) => s + p.monto, 0);
  return {
    id: c.id as string, mesa: c.mesa as string, estado: c.estado as Resumen["estado"], abierta_at: c.abierta_at as string,
    cerrada_at: (c.cerrada_at as string) ?? null, nota_cierre: (c.nota_cierre as string) ?? null,
    total, pagado, saldo: total - pagado, minutos: ahoraMin(c.abierta_at as string), n_pedidos: idsPedidos.size, items, pagos,
  };
}

export async function detalles(db: SupabaseClient, cuentas: Fila[]): Promise<Detalle[]> {
  const todo = await cargarTodo(db, cuentas.map(c => c.id as string));
  return cuentas.map(c => armar(c, todo));
}

export async function detalle(db: SupabaseClient, id: string): Promise<Detalle | null> {
  const { data: c } = await db.from("cuentas").select("*").eq("id", id).maybeSingle();
  if (!c) return null;
  if (c.estado === "abierta") await adjuntarPedidos(db, [{ id: c.id, mesa: c.mesa }]);
  return (await detalles(db, [c]))[0];
}

/** Cierra la cuenta como pagada si ya no queda saldo. Devuelve el detalle actualizado. */
export async function revisarSaldo(db: SupabaseClient, id: string): Promise<Detalle | null> {
  const d = await detalle(db, id);
  if (!d) return null;
  if (d.estado === "abierta" && d.total > 0 && d.saldo <= 0) {
    await db.from("cuentas").update({ estado: "pagada", cerrada_at: new Date().toISOString() }).eq("id", id);
    return detalle(db, id);
  }
  return d;
}
