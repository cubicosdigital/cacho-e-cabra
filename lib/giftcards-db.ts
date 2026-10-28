import { getSupabase } from "./supabase";
import { txt, num } from "./coleccion";
import { hoyChile, porCodigo, type EstadoGiftcard, type Giftcard, type PedidoGiftcards, type TipoGiftcard } from "./giftcards";

// Solo servidor. Usa la service key: las políticas de la tabla no dan acceso a `anon`.

const TABLA = "giftcards";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Error de Supabase → texto útil. El caso más común al estrenar el módulo es que falten las migraciones. */
function fallo(accion: string, e: { message: string; code?: string }): Error {
  if (e.code === "PGRST205" || e.code === "42P01" || /Could not find the table|does not exist/i.test(e.message)) {
    return new Error("Falta crear la tabla de gift cards en Supabase: ejecuta las migraciones 020 y 021 en el SQL Editor.");
  }
  if (e.code === "PGRST202" || /Could not find the function/i.test(e.message)) {
    return new Error("Falta la función de gift cards en Supabase: ejecuta la migración 021 en el SQL Editor.");
  }
  return new Error(`${accion}: ${e.message}`);
}

function aDominio(f: Record<string, unknown>): Giftcard {
  return {
    id: String(f.id),
    codigo: txt(f.codigo),
    tipo: txt(f.tipo, "monto") as TipoGiftcard,
    valor: num(f.valor),
    mensaje: txt(f.mensaje),
    para: txt(f.para),
    telefono: txt(f.telefono),
    vence: typeof f.vence === "string" ? f.vence.slice(0, 10) : null,
    estado: txt(f.estado, "activa") as EstadoGiftcard,
    creadaPor: txt(f.creada_por),
    creadaEn: txt(f.creada_en),
    canjeadaEn: typeof f.canjeada_en === "string" ? f.canjeada_en : null,
    lote: typeof f.lote === "string" ? f.lote : null,
  };
}

export async function listarGiftcards(): Promise<Giftcard[]> {
  const { data, error } = await getSupabase().from(TABLA).select("*").order("creada_en", { ascending: false }).order("codigo", { ascending: false }).limit(1000);
  if (error) throw fallo("No se pudieron leer las gift cards", error);
  return (data ?? []).map(aDominio);
}

/** Null si no existe o si el id ni siquiera tiene forma de uuid (llega desde una URL pública). */
export async function obtenerGiftcard(id: string): Promise<Giftcard | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await getSupabase().from(TABLA).select("*").eq("id", id).maybeSingle();
  if (error) throw fallo("No se pudo leer la gift card", error);
  return data ? aDominio(data) : null;
}

/** Todas las gift cards de un lote, de menor a mayor número. Lista vacía si no existe. */
export async function obtenerLote(lote: string): Promise<Giftcard[]> {
  if (!UUID.test(lote)) return [];
  const { data, error } = await getSupabase().from(TABLA).select("*").eq("lote", lote);
  if (error) throw fallo("No se pudo leer el lote", error);
  return (data ?? []).map(aDominio).sort(porCodigo);
}

/**
 * Crea `cantidad` gift cards con números correlativos. Lo hace una función de la base
 * (migración 021), en una sola transacción y con candado, para que los números de la
 * tanda salgan siempre seguidos aunque dos personas generen a la vez.
 */
export async function crearGiftcards(datos: PedidoGiftcards, creadaPor: string): Promise<Giftcard[]> {
  const { data, error } = await getSupabase().rpc("crear_giftcards", {
    p_cantidad: datos.cantidad,
    p_tipo: datos.tipo,
    p_valor: datos.valor,
    p_mensaje: datos.mensaje,
    p_para: datos.para,
    p_telefono: datos.telefono,
    p_vence: datos.vence,
    p_creada_por: creadaPor,
  });
  if (error) throw fallo("No se pudo crear la gift card", error);
  return ((data ?? []) as Record<string, unknown>[]).map(aDominio).sort(porCodigo);
}

export async function cambiarEstadoGiftcard(id: string, estado: EstadoGiftcard): Promise<Giftcard | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await getSupabase()
    .from(TABLA)
    .update({ estado, canjeada_en: estado === "canjeada" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw fallo("No se pudo actualizar la gift card", error);
  return data ? aDominio(data) : null;
}

export type ResultadoCanje = { resultado: "ok" | "ya_canjeada" | "anulada" | "vencida" | "no_existe"; giftcard: Giftcard | null };

/**
 * Canjea una gift card. La condición va dentro de la propia actualización (activa y no vencida),
 * así dos personas canjeándola al mismo tiempo no pueden lograrlo las dos: una gana y la otra
 * recibe "ya canjeada". No se confía en lo que muestra la pantalla de quien canjea.
 */
export async function canjearGiftcard(id: string): Promise<ResultadoCanje> {
  if (!UUID.test(id)) return { resultado: "no_existe", giftcard: null };

  const { data, error } = await getSupabase()
    .from(TABLA)
    .update({ estado: "canjeada", canjeada_en: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "activa")
    .or(`vence.is.null,vence.gte.${hoyChile()}`)
    .select("*")
    .maybeSingle();
  if (error) throw fallo("No se pudo canjear la gift card", error);
  if (data) return { resultado: "ok", giftcard: aDominio(data) };

  // No se canjeó: se averigua por qué para explicarlo.
  const actual = await obtenerGiftcard(id);
  if (!actual) return { resultado: "no_existe", giftcard: null };
  if (actual.estado === "canjeada") return { resultado: "ya_canjeada", giftcard: actual };
  if (actual.estado === "anulada") return { resultado: "anulada", giftcard: actual };
  return { resultado: "vencida", giftcard: actual };
}

export async function eliminarGiftcard(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await getSupabase().from(TABLA).delete().eq("id", id).select("id");
  if (error) throw fallo("No se pudo eliminar la gift card", error);
  return (data ?? []).length > 0;
}
