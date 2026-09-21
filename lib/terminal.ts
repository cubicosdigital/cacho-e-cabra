export type TipoComando = "sincronizar_usuarios" | "ajustar_hora" | "iniciar_huella" | "borrar_usuario" | "descargar_marcaciones";
export type EstadoComando = "pendiente" | "en_proceso" | "ok" | "error";

export interface UsuarioTerminal { uid: number; user_id: string; name: string; huellas: number }
export interface EstadoTerminal {
  terminal_ok: boolean; ip: string | null; serie: string | null; firmware: string | null; hora_terminal: string | null;
  usuarios: number | null; marcaciones: number | null; usuarios_detalle: UsuarioTerminal[];
  ultima_marca: string | null; ultima_sync: string | null; ultimo_latido: string | null; mensaje: string | null;
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
