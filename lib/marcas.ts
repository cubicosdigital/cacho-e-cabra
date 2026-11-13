import { getSupabase } from "@/lib/supabase";
import { asignarTiposPorTurno, type Marca } from "@/lib/terminal";

const FECHA_HORA = /(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/;

/**
 * Guarda marcaciones del terminal (por puente o por archivo de pendrive).
 * Cada turno se recalcula con lo ya guardado + lo nuevo, así se puede repetir la carga sin duplicar.
 */
export async function guardarMarcas(marcas: Marca[]) {
  const db = getSupabase();
  const { data: empleados } = await db.from("empleados").select("id, zk_id").not("zk_id", "is", null);
  const porZk = new Map((empleados ?? []).map(e => [String(e.zk_id), e.id as string]));

  const nuevas = new Map<string, { fecha: string; hora: string }[]>(); // empleado -> marcas nuevas
  const sinMapear = new Set<string>();
  let invalidas = 0;
  for (const m of marcas) {
    const empleadoId = porZk.get(String(m.user_id).trim());
    if (!empleadoId) { sinMapear.add(String(m.user_id).trim()); continue; }
    const t = FECHA_HORA.exec(String(m.timestamp));
    if (!t) { invalidas++; continue; }
    nuevas.set(empleadoId, [...(nuevas.get(empleadoId) ?? []), { fecha: t[1], hora: t[2] }]);
  }

  const mueveDia = (f: string, n: number) => { const [y, mo, d] = f.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10); };

  let guardadas = 0;
  for (const [empleadoId, lista] of nuevas) {
    const fechas = lista.map(x => x.fecha).sort();
    // Un turno puede cruzar la medianoche: se recalcula también el día anterior y el siguiente.
    const desde = mueveDia(fechas[0], -1), hasta = mueveDia(fechas[fechas.length - 1], 1);
    const { data: previas } = await db.from("asistencias").select("fecha, hora").eq("empleado_id", empleadoId).eq("origen", "terminal").gte("fecha", desde).lte("fecha", hasta);
    const todas = [...lista, ...(previas ?? []).map(p => ({ fecha: p.fecha as string, hora: String(p.hora).slice(0, 8) }))];

    const filas = asignarTiposPorTurno(todas).map(x => ({ empleado_id: empleadoId, fecha: x.fecha, hora: x.hora, tipo: x.tipo, origen: "terminal" }));

    const { error: errDel } = await db.from("asistencias").delete().eq("empleado_id", empleadoId).eq("origen", "terminal").gte("fecha", desde).lte("fecha", hasta);
    if (errDel) throw new Error(errDel.message);
    for (let k = 0; k < filas.length; k += 500) {
      const { error } = await db.from("asistencias").insert(filas.slice(k, k + 500));
      if (error) throw new Error(error.message);
    }
    guardadas += filas.length;
  }
  return { guardadas, sinMapear: [...sinMapear], invalidas };
}

/** Lee el archivo de asistencia que exporta el terminal a un pendrive (attlog.dat): sin encabezados, separado por tabulaciones. */
export function leerAttlog(texto: string): Marca[] | null {
  const marcas: Marca[] = [];
  let lineas = 0;
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    lineas++;
    const partes = linea.trim().split(/\t+|\s{2,}/);
    const id = partes[0]?.trim();
    const fh = FECHA_HORA.exec(linea);
    if (id && /^\d+$/.test(id) && fh) marcas.push({ user_id: id, timestamp: `${fh[1]} ${fh[2]}` });
  }
  // Si casi ninguna línea tiene ese formato, no es un attlog: que lo intente el lector de Excel/CSV.
  return lineas > 0 && marcas.length / lineas >= 0.8 ? marcas : null;
}
