import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";
import { guardarMarcas, leerAttlog } from "@/lib/marcas";
import { leerCsv, leerXlsx, type Fila } from "@/lib/hojas";

const MAX_BYTES = 5 * 1024 * 1024;

/** Busca la primera clave de la fila cuyo nombre de columna (normalizado) matchee alguno de los alias. */
function buscar(fila: Record<string, unknown>, alias: string[]): unknown {
  const claves = Object.keys(fila);
  for (const alias1 of alias) {
    const clave = claves.find(k => k.trim().toLowerCase() === alias1);
    if (clave !== undefined) return fila[clave];
  }
  return undefined;
}

/** Separa fecha y hora de un valor del archivo. Se lee tal cual viene (hora del terminal): sin conversiones de zona horaria. */
function partirFechaHora(valor: unknown): { fecha: string; hora: string } | null {
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    // Las fechas de Excel llegan como "hora de reloj" en UTC, con un pequeño error de redondeo: se ajusta al segundo más cercano.
    const iso = new Date(Math.round(valor.getTime() / 1000) * 1000).toISOString();
    return { fecha: iso.slice(0, 10), hora: iso.slice(11, 19) };
  }
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  const iso = /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t);
  if (iso) return { fecha: `${iso[1]}-${iso[2]}-${iso[3]}`, hora: `${iso[4].padStart(2, "0")}:${iso[5]}:${iso[6] ?? "00"}` };
  const chile = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t); // día/mes/año
  if (chile) return { fecha: `${chile[3]}-${chile[2].padStart(2, "0")}-${chile[1].padStart(2, "0")}`, hora: `${chile[4].padStart(2, "0")}:${chile[5]}:${chile[6] ?? "00"}` };
  return null;
}

export async function POST(req: NextRequest) {
  const g = await requirePermiso("asistencia", "c");
  if (g.error) return g.error;
  const db = g.db;

  const form = await req.formData();
  const archivo = form.get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: "El archivo no puede pesar más de 5 MB" }, { status: 400 });

  // Archivo del pendrive del terminal (attlog.dat): sin encabezados, entrada/salida se deduce por orden en el día.
  if (/\.(dat|txt)$/i.test(archivo.name)) {
    const marcas = leerAttlog(await archivo.text());
    if (marcas) {
      try {
        const r = await guardarMarcas(marcas);
        if (r.guardadas === 0) {
          return NextResponse.json({ error: "No se pudo asignar ninguna marcación. Revisa que cada trabajador tenga su ID de terminal en la lista.", sinMapear: r.sinMapear }, { status: 400 });
        }
        return NextResponse.json({ importados: r.guardadas, total_filas: marcas.length, filas_invalidas: r.invalidas, ids_sin_mapear: r.sinMapear });
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
      }
    }
  }

  const nombreArchivo = archivo.name.toLowerCase();
  if (nombreArchivo.endsWith(".xls")) {
    return NextResponse.json({ error: "Los archivos .xls antiguos no se pueden leer. Ábrelo en Excel y guárdalo como .xlsx o como CSV." }, { status: 400 });
  }

  let filas: Fila[];
  try {
    if (nombreArchivo.endsWith(".xlsx")) filas = await leerXlsx(Buffer.from(await archivo.arrayBuffer()));
    else if (/\.(csv|txt)$/.test(nombreArchivo)) filas = leerCsv(await archivo.text());
    else return NextResponse.json({ error: "Formato no permitido. Usa el archivo del pendrive (.dat), un .xlsx o un CSV." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. ¿Es un Excel (.xlsx) o CSV válido?" }, { status: 400 });
  }

  const { data: empleados } = await db.from("empleados").select("id, zk_id, nombre");
  const porZkId = new Map((empleados ?? []).filter(e => e.zk_id != null).map(e => [String(e.zk_id), e.id]));

  const registros: { empleado_id: string; fecha: string; hora: string; tipo: string; origen: string }[] = [];
  const sinMapear = new Set<string>();
  let filasInvalidas = 0;

  for (const fila of filas) {
    const zkId = buscar(fila, ["id", "pin", "user id", "userid", "user-id", "no."]);
    const fechaHoraVal = buscar(fila, ["date/time", "datetime", "fecha/hora", "fecha y hora", "time", "hora"]);
    const estadoRaw = String(buscar(fila, ["status", "state", "estado", "tipo"]) ?? "").toLowerCase();

    if (zkId == null || fechaHoraVal == null) { filasInvalidas++; continue; }

    const empleadoId = porZkId.get(String(zkId).trim());
    if (!empleadoId) { sinMapear.add(String(zkId).trim()); continue; }

    const partido = partirFechaHora(fechaHoraVal);
    if (!partido) { filasInvalidas++; continue; }

    const tipo = estadoRaw.includes("out") || estadoRaw.includes("sal") ? "salida" : "entrada";

    registros.push({ empleado_id: empleadoId, fecha: partido.fecha, hora: partido.hora, tipo, origen: archivo.name });
  }

  if (registros.length === 0) {
    return NextResponse.json({
      error: "No se pudo mapear ningún registro. Revisa que la columna de ID coincida con el zk_id asignado a cada empleado.",
      sinMapear: [...sinMapear],
    }, { status: 400 });
  }

  const { error, count } = await db.from("asistencias").upsert(registros, { onConflict: "empleado_id,fecha,hora,tipo", ignoreDuplicates: true, count: "exact" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    importados: count ?? registros.length,
    total_filas: filas.length,
    filas_invalidas: filasInvalidas,
    ids_sin_mapear: [...sinMapear],
  });
}
