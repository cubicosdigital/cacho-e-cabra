// Parte "pura" del menú del día: tipos, formato de fechas y validación.
// La usan el servidor, el admin (navegador) y el dibujo de las gráficas, así que no puede
// importar nada de Node ni de Supabase. El acceso a la base está en menu-dia-db.ts.

export interface PlatoMenu {
  /** Título corto del plato. Ej: "Fetuccini al pil pil". */
  nombre: string;
  /** Lo que lo acompaña. Ej: "Acompañado de camarones al ajillo". Puede ir vacío. */
  descripcion: string;
  /** Pesos enteros, o null si el plato no lleva precio. */
  precio: number | null;
}

/** Lo que se edita y se dibuja. */
export interface BorradorMenu {
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:MM, desde cuándo se sirve */
  horaDesde: string;
  nota: string;
  publicado: boolean;
  platos: PlatoMenu[];
}

export interface MenuDia extends BorradorMenu {
  id: string;
  creadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
}

export const PLATOS_MAX = 8;
export const NOMBRE_MAX = 50;
export const DESCRIPCION_MAX = 110;
export const NOTA_MAX = 80;
export const PRECIO_MAX = 1_000_000;
export const NOTA_POR_DEFECTO = "Disponible también nuestra carta";
export const HORA_POR_DEFECTO = "13:00";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Una fecha YYYY-MM-DD real (no acepta 2026-02-31). */
export function fechaValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function horaValida(s: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

/** "2026-11-14" → { dia: "Sábado", fecha: "14 de noviembre" }. El día sale de la propia fecha: no depende de la zona horaria. */
export function etiquetaDia(iso: string): { dia: string; fecha: string; corta: string } {
  if (!fechaValida(iso)) return { dia: "", fecha: "", corta: "" };
  const d = new Date(`${iso}T12:00:00Z`);
  const dia = DIAS[d.getUTCDay()];
  const n = d.getUTCDate();
  const mes = MESES[d.getUTCMonth()];
  return { dia, fecha: `${n} de ${mes}`, corta: `${dia.slice(0, 3)} ${n} ${mes.slice(0, 3)}` };
}

/** 12900 → "$12.900" (sin depender del ICU de Node ni del navegador). */
export function precioTexto(n: number): string {
  return `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Hoy en formato YYYY-MM-DD, según la hora de Chile (no la del servidor). */
export function hoyChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function borradorVacio(fecha: string): BorradorMenu {
  return { fecha, horaDesde: HORA_POR_DEFECTO, nota: NOTA_POR_DEFECTO, publicado: false, platos: [{ nombre: "", descripcion: "", precio: null }] };
}

/** Los platos con nombre, limpios: lo que de verdad se publica y se dibuja. */
export function platosLimpios(platos: PlatoMenu[]): PlatoMenu[] {
  return platos.filter(p => p.nombre.trim()).map(p => ({ ...p, nombre: p.nombre.trim(), descripcion: p.descripcion.trim() }));
}

const limpiar = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Valida lo que llega del formulario. Devuelve el menú limpio o un mensaje de error. */
export function validarMenu(entrada: unknown): { ok: true; datos: BorradorMenu } | { ok: false; error: string } {
  const b = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;

  const fecha = limpiar(b.fecha);
  if (!fechaValida(fecha)) return { ok: false, error: "Elige la fecha del menú" };

  const horaDesde = limpiar(b.horaDesde) || HORA_POR_DEFECTO;
  if (!horaValida(horaDesde)) return { ok: false, error: "La hora de inicio no es válida" };

  const nota = limpiar(b.nota);
  if (nota.length > NOTA_MAX) return { ok: false, error: `La nota no puede superar ${NOTA_MAX} caracteres` };

  if (!Array.isArray(b.platos)) return { ok: false, error: "Agrega al menos un plato" };
  const platos: PlatoMenu[] = [];
  for (const [i, raw] of b.platos.entries()) {
    const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const nombre = limpiar(p.nombre);
    if (!nombre) continue; // las filas vacías se ignoran
    if (nombre.length > NOMBRE_MAX) return { ok: false, error: `El plato ${i + 1} supera ${NOMBRE_MAX} caracteres` };
    const descripcion = limpiar(p.descripcion);
    if (descripcion.length > DESCRIPCION_MAX) return { ok: false, error: `El detalle del plato ${i + 1} supera ${DESCRIPCION_MAX} caracteres` };

    let precio: number | null = null;
    if (p.precio !== null && p.precio !== undefined && p.precio !== "") {
      precio = Number(p.precio);
      if (!Number.isInteger(precio) || precio < 0 || precio > PRECIO_MAX) return { ok: false, error: `El precio del plato ${i + 1} no es válido` };
    }
    platos.push({ nombre, descripcion, precio });
  }
  if (platos.length === 0) return { ok: false, error: "Agrega al menos un plato con nombre" };
  if (platos.length > PLATOS_MAX) return { ok: false, error: `Un menú puede tener hasta ${PLATOS_MAX} platos` };

  return { ok: true, datos: { fecha, horaDesde, nota, publicado: b.publicado === true, platos } };
}
