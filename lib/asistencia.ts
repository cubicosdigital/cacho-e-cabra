import { CORTE_TURNO, MAX_TURNO_H, fechaDeTurno } from "./terminal";
/** Hora a la que se espera que entren y minutos de gracia antes de contar un atraso. */
export const HORA_ENTRADA_ESPERADA = "08:00";
export const TOLERANCIA_MIN = 10;
export { CORTE_TURNO, MAX_TURNO_H, fechaDeTurno } from "./terminal";

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
  // Se agrupa por turno: lo marcado de madrugada (antes de las 06:00) es la salida del turno del día anterior.
  const grupos = new Map<string, Marca[]>();
  for (const m of marcas) {
    const k = `${m.empleado_id}|${fechaDeTurno(m.fecha, m.hora)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(m);
  }
  const limite = minutos(HORA_ENTRADA_ESPERADA) + TOLERANCIA_MIN;
  return [...grupos.values()].map(rs => {
    const fechaTurno = fechaDeTurno(rs[0].fecha, rs[0].hora);
    const aj = (h: string) => minutos(h) + (h < CORTE_TURNO ? 1440 : 0); // la madrugada cuenta como "día siguiente"
    const entrada = rs.filter(r => r.tipo === "entrada").map(r => r.hora).sort((a, b) => aj(a) - aj(b))[0] ?? null;
    const salida = rs.filter(r => r.tipo === "salida").map(r => r.hora).sort((a, b) => aj(a) - aj(b)).at(-1) ?? null;
    const dia = DIAS_TURNO[parseFecha(fechaTurno).getDay()];
    const prog = programadas?.get(`${rs[0].empleado_id}|${dia}`);
    const inicioContado = entrada ? (prog ? Math.max(aj(entrada), minutos(prog)) : aj(entrada)) : null;
    return {
      empleado_id: rs[0].empleado_id, fecha: fechaTurno, entrada, salida,
      trabajado: inicioContado != null && salida ? Math.max(0, aj(salida) - inicioContado) : null,
      tarde: entrada ? aj(entrada) > (prog ? minutos(prog) + TOLERANCIA_MIN : limite) : false,
    };
  });
}

/**
 * Estado de la salida de un turno: "en_turno" si aún cabe dentro del máximo (puede estar trabajando todavía),
 * "no_marco_salida" si ya pasó ese máximo sin salida, "no_marco_entrada" si hay salida pero no entrada.
 */
export function estadoDia(d: DiaTrabajado, ahoraMs: number): "ok" | "en_turno" | "no_marco_salida" | "no_marco_entrada" {
  if (!d.entrada) return d.salida ? "no_marco_entrada" : "ok";
  if (d.salida) return "ok";
  const [y, m, dia] = d.fecha.split("-").map(Number);
  const [hh, mm] = d.entrada.split(":").map(Number);
  const inicio = new Date(y, m - 1, dia, hh, mm).getTime();
  return (ahoraMs - inicio) / 3600000 <= MAX_TURNO_H ? "en_turno" : "no_marco_salida";
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
