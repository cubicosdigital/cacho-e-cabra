/** Hora a la que se espera que entren y minutos de gracia antes de contar un atraso. */
export const HORA_ENTRADA_ESPERADA = "08:00";
export const TOLERANCIA_MIN = 10;

export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface Marca { empleado_id: string; fecha: string; hora: string; tipo: "entrada" | "salida" }
export interface DiaTrabajado {
  empleado_id: string; fecha: string;
  entrada: string | null; salida: string | null;
  trabajado: number | null; // minutos
  tarde: boolean;
}

export function minutos(h: string) {
  const [hh, mm] = h.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

export function fmtHoras(min: number) {
  return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;
}

export function fmtHoraMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`;
}

export function parseFecha(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtFechaCorta(fecha: string) {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

const DIAS_TURNO = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/** Hora de entrada programada por persona y día de la semana: clave "empleado_id|lunes". */
export type EntradasProgramadas = Map<string, string>;

export function entradasProgramadas(turnos: { empleado_id: string; dia_semana: string; hora_entrada: string | null }[]): EntradasProgramadas {
  const m: EntradasProgramadas = new Map();
  for (const t of turnos) if (t.hora_entrada) m.set(`${t.empleado_id}|${t.dia_semana}`, t.hora_entrada.slice(0, 5));
  return m;
}

/**
 * Junta las marcas sueltas en un resumen por trabajador y día.
 * Si la persona marca antes de su hora de entrada programada, la marca queda registrada pero el tiempo se
 * cuenta desde la hora programada; lo que trabaja después de la salida programada sí se suma.
 */
export function resumirDias(marcas: Marca[], programadas?: EntradasProgramadas): DiaTrabajado[] {
  const grupos = new Map<string, Marca[]>();
  for (const m of marcas) {
    const k = `${m.empleado_id}|${m.fecha}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(m);
  }
  const limite = minutos(HORA_ENTRADA_ESPERADA) + TOLERANCIA_MIN;
  return [...grupos.values()].map(rs => {
    const entrada = rs.filter(r => r.tipo === "entrada").map(r => r.hora).sort()[0] ?? null;
    const salida = rs.filter(r => r.tipo === "salida").map(r => r.hora).sort().at(-1) ?? null;
    const dia = DIAS_TURNO[parseFecha(rs[0].fecha).getDay()];
    const prog = programadas?.get(`${rs[0].empleado_id}|${dia}`);
    const inicioContado = entrada ? (prog ? Math.max(minutos(entrada), minutos(prog)) : minutos(entrada)) : null;
    return {
      empleado_id: rs[0].empleado_id, fecha: rs[0].fecha, entrada, salida,
      trabajado: inicioContado != null && salida ? Math.max(0, minutos(salida) - inicioContado) : null,
      tarde: entrada ? minutos(entrada) > (prog ? minutos(prog) + TOLERANCIA_MIN : limite) : false,
    };
  });
}

export interface Barra { etiqueta: string; valor: number; detalle?: string }

/** Suma valores por día si el rango es corto, o por semana (lunes) si es largo. */
export function agruparPorPeriodo(dias: DiaTrabajado[], valor: (d: DiaTrabajado) => number, umbralDias = 31): { barras: Barra[]; porSemana: boolean } {
  const fechas = [...new Set(dias.map(d => d.fecha))].sort();
  const porSemana = fechas.length > umbralDias;
  const acum = new Map<string, number>();
  for (const d of dias) {
    let clave = d.fecha;
    if (porSemana) {
      const f = parseFecha(d.fecha);
      const lunes = new Date(f.getFullYear(), f.getMonth(), f.getDate() - ((f.getDay() + 6) % 7));
      clave = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, "0")}-${String(lunes.getDate()).padStart(2, "0")}`;
    }
    acum.set(clave, (acum.get(clave) ?? 0) + valor(d));
  }
  const barras = [...acum.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([f, v]) => ({ etiqueta: fmtFechaCorta(f), valor: v, detalle: `${porSemana ? "Semana del " : ""}${fmtFechaCorta(f)}` }));
  return { barras, porSemana };
}
