import { getSupabase } from "./supabase";
import { txt } from "./coleccion";
import { hoyChile, type BorradorMenu, type MenuDia, type PlatoMenu } from "./menu-dia";

// Solo servidor. Usa la service key: la tabla no tiene política para `anon`.

const TABLA = "menu_dias";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Error de Supabase → texto útil. El caso más común al estrenar el módulo es que falte la migración. */
function fallo(accion: string, e: { message: string; code?: string }): Error {
  if (e.code === "PGRST205" || e.code === "42P01" || /Could not find the table|does not exist/i.test(e.message)) {
    return new Error("Falta crear la tabla del menú del día en Supabase: ejecuta la migración 023 en el SQL Editor.");
  }
  if (e.code === "23505") return new Error("Ya existe un menú para esa fecha. Edítalo desde la lista.");
  return new Error(`${accion}: ${e.message}`);
}

function platosDe(v: unknown): PlatoMenu[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => {
    const p = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return {
      nombre: txt(p.nombre),
      descripcion: txt(p.descripcion),
      precio: typeof p.precio === "number" && Number.isFinite(p.precio) ? p.precio : null,
    };
  });
}

function aDominio(f: Record<string, unknown>): MenuDia {
  return {
    id: String(f.id),
    fecha: typeof f.fecha === "string" ? f.fecha.slice(0, 10) : "",
    horaDesde: txt(f.hora_desde, "13:00"),
    nota: txt(f.nota),
    publicado: f.publicado === true,
    platos: platosDe(f.platos),
    creadoPor: txt(f.creado_por),
    creadoEn: txt(f.creado_en),
    actualizadoEn: txt(f.actualizado_en),
  };
}

const aFila = (d: BorradorMenu) => ({
  fecha: d.fecha,
  hora_desde: d.horaDesde,
  nota: d.nota,
  publicado: d.publicado,
  platos: d.platos,
});

/** Todos los menús (el más próximo primero), para el admin. */
export async function listarMenus(): Promise<MenuDia[]> {
  const { data, error } = await getSupabase().from(TABLA).select("*").order("fecha", { ascending: false }).limit(400);
  if (error) throw fallo("No se pudieron leer los menús", error);
  return (data ?? []).map(aDominio);
}

/** Null si no existe o si el id ni siquiera tiene forma de uuid (llega desde una URL). */
export async function obtenerMenu(id: string): Promise<MenuDia | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await getSupabase().from(TABLA).select("*").eq("id", id).maybeSingle();
  if (error) throw fallo("No se pudo leer el menú", error);
  return data ? aDominio(data) : null;
}

/**
 * Menús publicados de hoy en adelante (hasta `dias` días), para la web pública.
 * Si la tabla aún no existe devuelve lista vacía: la web no debe romperse por eso.
 */
export async function menusPublicados(dias = 14, desde: string = hoyChile()): Promise<MenuDia[]> {
  const hasta = new Date(`${desde}T12:00:00Z`);
  hasta.setUTCDate(hasta.getUTCDate() + dias);
  const { data, error } = await getSupabase()
    .from(TABLA)
    .select("*")
    .eq("publicado", true)
    .gte("fecha", desde)
    .lte("fecha", hasta.toISOString().slice(0, 10))
    .order("fecha", { ascending: true });
  if (error) {
    console.error("menusPublicados:", error.message);
    return [];
  }
  return (data ?? []).map(aDominio);
}

export async function crearMenu(datos: BorradorMenu, creadoPor: string): Promise<MenuDia> {
  const { data, error } = await getSupabase().from(TABLA).insert({ ...aFila(datos), creado_por: creadoPor }).select("*").single();
  if (error) throw fallo("No se pudo crear el menú", error);
  return aDominio(data);
}

export async function actualizarMenu(id: string, datos: BorradorMenu): Promise<MenuDia | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await getSupabase()
    .from(TABLA)
    .update({ ...aFila(datos), actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw fallo("No se pudo guardar el menú", error);
  return data ? aDominio(data) : null;
}

export async function eliminarMenu(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const { data, error } = await getSupabase().from(TABLA).delete().eq("id", id).select("id");
  if (error) throw fallo("No se pudo eliminar el menú", error);
  return (data ?? []).length > 0;
}
