import { getSupabase } from "./supabase";

/**
 * Helpers para las tablas que antes vivían en data/*.json.
 *
 * Los módulos que migramos exponían `getX()` / `saveX(lista)`: leer todo y
 * reescribir todo. Mantener esa forma deja intactas las rutas de la API, así
 * que acá replicamos esa semántica sobre Postgres.
 */

/** Lee la tabla completa y la traduce al tipo de dominio. */
export async function leerColeccion<T>(
  tabla: string,
  orden: { columna: string; ascendente: boolean },
  aDominio: (fila: Record<string, unknown>) => T,
): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(tabla)
    .select("*")
    .order(orden.columna, { ascending: orden.ascendente });

  if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
  return (data ?? []).map(aDominio);
}

/** Lee una fila por id, o null si no existe. */
export async function leerFila<T>(
  tabla: string,
  id: string,
  aDominio: (fila: Record<string, unknown>) => T,
): Promise<T | null> {
  const { data, error } = await getSupabase()
    .from(tabla)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer ${tabla}/${id}: ${error.message}`);
  return data ? aDominio(data) : null;
}

/**
 * Deja la tabla con exactamente estas filas.
 *
 * Primero inserta/actualiza y sólo después borra lo que sobró: si algo falla a
 * mitad de camino preferimos quedar con filas de más y no con la tabla vacía.
 */
export async function reemplazarColeccion(
  tabla: string,
  filas: Record<string, unknown>[],
): Promise<void> {
  const db = getSupabase();

  if (filas.length) {
    const { error } = await db.from(tabla).upsert(filas, { onConflict: "id" });
    if (error) throw new Error(`No se pudo guardar ${tabla}: ${error.message}`);
  }

  const { data: existentes, error: errLeer } = await db.from(tabla).select("id");
  if (errLeer) throw new Error(`No se pudo revisar ${tabla}: ${errLeer.message}`);

  const vivos = new Set(filas.map(f => String(f.id)));
  const aBorrar = (existentes ?? [])
    .map(f => String((f as { id: unknown }).id))
    .filter(id => !vivos.has(id));

  if (aBorrar.length) {
    const { error } = await db.from(tabla).delete().in("id", aBorrar);
    if (error) throw new Error(`No se pudo limpiar ${tabla}: ${error.message}`);
  }
}

/** Lee un campo que puede venir null desde Postgres, con valor por defecto. */
export function txt(v: unknown, porDefecto = ""): string {
  return typeof v === "string" ? v : porDefecto;
}

export function num(v: unknown, porDefecto = 0): number {
  return typeof v === "number" ? v : Number(v) || porDefecto;
}

export function bool(v: unknown, porDefecto = false): boolean {
  return typeof v === "boolean" ? v : porDefecto;
}
