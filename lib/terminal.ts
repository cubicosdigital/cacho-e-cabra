export type TipoComando = "sincronizar_usuarios" | "ajustar_hora" | "iniciar_huella" | "borrar_usuario" | "descargar_marcaciones";
export type EstadoComando = "pendiente" | "en_proceso" | "ok" | "error";

export interface UsuarioTerminal { uid: number; user_id: string; name: string; huellas: number }
export interface EstadoTerminal {
  terminal_ok: boolean; ip: string | null; serie: string | null; firmware: string | null; hora_terminal: string | null;
  usuarios: number | null; marcaciones: number | null; usuarios_detalle: UsuarioTerminal[];
  ultima_marca: string | null; ultima_sync: string | null; ultimo_latido: string | null; mensaje: string | null; ip_manual: string | null;
}
export interface Comando {
  id: string; tipo: TipoComando; payload: Record<string, unknown>; estado: EstadoComando;
  resultado: string | null; created_at: string; ejecutado_at: string | null;
}

/** Segundos sin latido tras los cuales se considera que el puente está apagado. */
export const LATIDO_VIGENCIA_S = 40;

/** Nombre corto para la pantalla del terminal: primer nombre + último apellido, sin tildes, máx. 24 letras. */
export function nombreParaTerminal(nombreCompleto: string) {
  const limpio = nombreCompleto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/);
  const corto = limpio.length > 1 ? `${limpio[0]} ${limpio[limpio.length - 1]}` : limpio[0] ?? "";
  return corto.slice(0, 24);
}

/** Las marcas de madrugada (antes de esta hora) son la salida del turno que empezó el día anterior. */
export const CORTE_TURNO = "06:00:00";

export function fechaDeTurno(fecha: string, hora: string): string {
  if (hora >= CORTE_TURNO) return fecha;
  const [y, m, d] = fecha.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return prev.toISOString().slice(0, 10);
}

/**
 * Igual que asignarTipos, pero agrupando por turno y no por día calendario: un turno de 16:30 a 02:00 queda
 * como entrada 16:30 (día D) y salida 02:00 (día D+1). Devuelve cada marca con su fecha real.
 */
export function asignarTiposPorTurno(marcas: { fecha: string; hora: string }[]): { fecha: string; hora: string; tipo: "entrada" | "salida" }[] {
  const unicas = [...new Map(marcas.map(m => [`${m.fecha} ${m.hora.slice(0, 8)}`, { fecha: m.fecha, hora: m.hora.slice(0, 8) }])).values()]
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  const seg = (m: { fecha: string; hora: string }) => { const [a, b, c] = m.hora.split(":").map(Number); return Date.parse(m.fecha + "T00:00:00Z") / 1000 + a * 3600 + b * 60 + (c || 0); };
  const validas: typeof unicas = [];
  for (const m of unicas) if (validas.length === 0 || seg(m) - seg(validas[validas.length - 1]) >= 60) validas.push(m);
  const contador = new Map<string, number>();
  return validas.map(m => {
    const turno = fechaDeTurno(m.fecha, m.hora);
    const i = contador.get(turno) ?? 0;
    contador.set(turno, i + 1);
    return { ...m, tipo: i % 2 === 0 ? "entrada" : "salida" };
  });
}

export interface Marca { user_id: string; timestamp: string } // timestamp local: "YYYY-MM-DD HH:MM:SS"

/**
 * El terminal no distingue entrada de salida (todo llega como "marcación"), así que se alterna
 * dentro de cada día: 1ª = entrada, 2ª = salida, 3ª = entrada… Los toques a menos de 1 minuto del
 * anterior se descartan (doble toque sobre el sensor).
 */
export function asignarTipos(horas: string[]): { hora: string; tipo: "entrada" | "salida" }[] {
  const orden = [...new Set(horas)].sort();
  const seg = (h: string) => { const [a, b, c] = h.split(":").map(Number); return a * 3600 + b * 60 + (c || 0); };
  const validas: string[] = [];
  for (const h of orden) if (validas.length === 0 || seg(h) - seg(validas[validas.length - 1]) >= 60) validas.push(h);
  return validas.map((hora, i) => ({ hora, tipo: i % 2 === 0 ? "entrada" : "salida" }));
}
