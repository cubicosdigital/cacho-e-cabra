import { leerColeccion, reemplazarColeccion, txt, num, bool } from "./coleccion";
import { getSupabase } from "./supabase";

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

const TABLA = "evento_registros";

function aDominio(f: Record<string, unknown>): Registro {
  return {
    id: String(f.id),
    nombre: txt(f.nombre),
    email: txt(f.email),
    telefono: txt(f.telefono),
    personas: num(f.personas, 1),
    evento_id: txt(f.evento_id),
    fecha_registro: txt(f.fecha_registro),
    confirmado: bool(f.confirmado),
    pagado: bool(f.pagado),
    created_at: txt(f.created_at),
  };
}

function aFila(r: Registro): Record<string, unknown> {
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    personas: r.personas,
    evento_id: r.evento_id,
    fecha_registro: r.fecha_registro,
    confirmado: r.confirmado,
    pagado: r.pagado,
    created_at: r.created_at,
  };
}

export async function getRegistros(): Promise<Registro[]> {
  return leerColeccion(TABLA, { columna: "created_at", ascendente: false }, aDominio);
}

export async function saveRegistros(registros: Registro[]): Promise<void> {
  await reemplazarColeccion(TABLA, registros.map(aFila));
}

/**
 * Alta directa de un registro.
 *
 * El formulario de inscripción es público y varias personas pueden estar
 * anotándose al mismo tiempo. Leer toda la tabla, agregar uno y reescribirla
 * haría que dos inscripciones simultáneas se pisaran entre sí, así que acá
 * insertamos una sola fila y dejamos que Postgres resuelva la concurrencia.
 */
export async function crearRegistro(datos: {
  nombre: string;
  email: string;
  telefono: string;
  personas: number;
  evento_id: string;
}): Promise<Registro> {
  const { data, error } = await getSupabase()
    .from(TABLA)
    .insert({
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      personas: datos.personas,
      evento_id: datos.evento_id,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo crear el registro: ${error.message}`);
  return aDominio(data);
}
