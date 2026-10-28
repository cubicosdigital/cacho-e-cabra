// Parte "pura" del módulo de gift cards: tipos, formato y validación.
// La usan tanto el servidor como el admin (navegador), así que no puede
// importar nada de Node ni de Supabase. El acceso a la base está en giftcards-db.ts.

export type TipoGiftcard = "monto" | "porcentaje";
export type EstadoGiftcard = "activa" | "canjeada" | "anulada";

export interface Giftcard {
  id: string;
  /** Código corto que el cliente muestra en caja. Ej: CC-7K4M-92QX */
  codigo: string;
  tipo: TipoGiftcard;
  /** Pesos enteros si tipo = monto; 1 a 100 si tipo = porcentaje. */
  valor: number;
  mensaje: string;
  para: string;
  telefono: string;
  /** Fecha de vencimiento YYYY-MM-DD, o null si no vence. */
  vence: string | null;
  estado: EstadoGiftcard;
  creadaPor: string;
  creadaEn: string;
  canjeadaEn: string | null;
  /** Las gift cards creadas juntas comparten lote. null si se creó una sola. */
  lote: string | null;
}

/** Lo mínimo que hace falta para dibujar la tarjeta. */
export interface DatosTarjeta {
  /** Con id y tipo "monto" la tarjeta lleva un QR que apunta a su página. Sin id (vista previa) lleva un QR de muestra. */
  id?: string;
  codigo: string;
  tipo: TipoGiftcard;
  valor: number;
  mensaje: string;
  para: string;
  vence: string | null;
}

/** Condiciones de uso: van siempre en la tarjeta, en la página del cliente y en el panel de canje. */
export const CONDICIONES = "Solo consumo en el local. No aplica descuento sobre descuento.";
export const CANTIDAD_MAX = 100;
export const SITIO_URL = "https://cachocabrabar.cl";
export const MENSAJE_MAX = 120;
export const PARA_MAX = 30;
export const VALOR_MAX_MONTO = 10_000_000;
export const MENSAJE_POR_DEFECTO = "Un regalo para que disfrutes de buena comida y buenos tragos.";

export const ESTADO_META: Record<EstadoGiftcard, { label: string; color: string; bg: string }> = {
  activa: { label: "Activa", color: "#34d399", bg: "#1a2e1a" },
  canjeada: { label: "Canjeada", color: "#FBBF24", bg: "#3a2f10" },
  anulada: { label: "Anulada", color: "#fca5a5", bg: "#2a1212" },
};

/** 25000 → "25.000" (sin depender del ICU de Node ni del navegador). */
export function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "$25.000" o "20%". */
export function valorTexto(tipo: TipoGiftcard, valor: number): string {
  return tipo === "porcentaje" ? `${valor}%` : `$${miles(valor)}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-12-31" → "31 dic 2026". Devuelve "" si no es una fecha válida. */
export function fechaCorta(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return "";
  return `${Number(m[3])} ${MESES[mes - 1]} ${m[1]}`;
}

/** Hoy en formato YYYY-MM-DD, según la hora de Chile (no la del servidor). */
export function hoyChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function estaVencida(g: Pick<Giftcard, "vence">): boolean {
  return !!g.vence && g.vence < hoyChile();
}

function fechaValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Quita lo que no sea dígito. Si queda vacío, devuelve "". */
export function soloDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

const UUID_EN_TEXTO = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Página pública de una gift card. Es lo que codifica su QR. */
export function urlGiftcard(id: string, origen: string = SITIO_URL): string {
  return `${origen}/giftcard/${id}`;
}

/**
 * Saca el id de una gift card del texto que lee el escáner. Solo se extrae un uuid:
 * lo escaneado es un dato externo, nunca se abre ni se sigue como link.
 */
export function idDesdeQr(texto: string): string | null {
  const m = UUID_EN_TEXTO.exec(texto);
  return m ? m[0].toLowerCase() : null;
}

/** Orden de menor a mayor número; los códigos numéricos van por largo y luego por texto. */
export function porCodigo(a: Pick<Giftcard, "codigo">, b: Pick<Giftcard, "codigo">): number {
  return a.codigo.length - b.codigo.length || a.codigo.localeCompare(b.codigo);
}

/** "000041 – 000060" para un conjunto de tarjetas (o un solo código si es una). */
export function rangoCodigos(tarjetas: Pick<Giftcard, "codigo">[]): string {
  if (tarjetas.length === 0) return "";
  const orden = [...tarjetas].sort(porCodigo);
  const primero = orden[0].codigo;
  const ultimo = orden[orden.length - 1].codigo;
  return primero === ultimo ? primero : `${primero} – ${ultimo}`;
}

/**
 * Número para wa.me. Los celulares chilenos son 9 dígitos que empiezan con 9:
 * 912345678 → 56912345678. Si ya viene con 56, se respeta.
 */
export function telefonoWhatsapp(tel: string): string {
  let d = soloDigitos(tel);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("9")) return `56${d}`;
  if (d.length === 8) return `569${d}`;
  return d;
}

export function mensajeWhatsapp(g: Pick<Giftcard, "para" | "tipo" | "valor" | "codigo">, url: string): string {
  const saludo = g.para ? `Hola ${g.para}!` : "Hola!";
  const regalo = g.tipo === "porcentaje"
    ? `una Gift Card de Cacho Cabra con ${g.valor}% de descuento`
    : `una Gift Card de Cacho Cabra por $${miles(g.valor)}`;
  return `${saludo} 🎁 Te regalamos ${regalo}.\n\nMírala y descárgala aquí: ${url}\n\nCódigo: ${g.codigo}`;
}

export function linkWhatsapp(g: Pick<Giftcard, "para" | "tipo" | "valor" | "codigo" | "telefono">, url: string): string {
  const tel = telefonoWhatsapp(g.telefono);
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensajeWhatsapp(g, url))}`;
}

export type NuevaGiftcard = Pick<Giftcard, "tipo" | "valor" | "mensaje" | "para" | "telefono" | "vence">;

/** Lo que se crea: los datos de la tarjeta y cuántas copias numeradas (1 a CANTIDAD_MAX). */
export type PedidoGiftcards = NuevaGiftcard & { cantidad: number };

/** Valida lo que llega del formulario. Devuelve los datos limpios o un mensaje de error. */
export function validarNueva(entrada: unknown, hoy: string = hoyChile()): { ok: true; datos: PedidoGiftcards } | { ok: false; error: string } {
  const b = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;

  const tipo = b.tipo;
  if (tipo !== "monto" && tipo !== "porcentaje") return { ok: false, error: "Elige si la gift card es por monto o por porcentaje" };

  const cantidad = b.cantidad === undefined || b.cantidad === "" ? 1 : Number(b.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAX) return { ok: false, error: `La cantidad debe ser un número entre 1 y ${CANTIDAD_MAX}` };

  const valor = Number(b.valor);
  if (!Number.isInteger(valor) || valor <= 0) return { ok: false, error: "El valor debe ser un número entero mayor a 0" };
  if (tipo === "porcentaje" && valor > 100) return { ok: false, error: "El descuento no puede superar el 100%" };
  if (tipo === "monto" && valor > VALOR_MAX_MONTO) return { ok: false, error: `El monto no puede superar $${miles(VALOR_MAX_MONTO)}` };

  const mensaje = String(b.mensaje ?? "").replace(/\s+/g, " ").trim();
  if (mensaje.length > MENSAJE_MAX) return { ok: false, error: `El mensaje no puede superar ${MENSAJE_MAX} caracteres` };

  const para = String(b.para ?? "").replace(/\s+/g, " ").trim();
  if (para.length > PARA_MAX) return { ok: false, error: `El nombre no puede superar ${PARA_MAX} caracteres` };

  const telefono = soloDigitos(String(b.telefono ?? ""));
  if (telefono.length > 15) return { ok: false, error: "El teléfono es demasiado largo" };

  const venceRaw = String(b.vence ?? "").trim();
  let vence: string | null = null;
  if (venceRaw) {
    if (!fechaValida(venceRaw)) return { ok: false, error: "La fecha de vencimiento no es válida" };
    if (venceRaw < hoy) return { ok: false, error: "La fecha de vencimiento no puede estar en el pasado" };
    vence = venceRaw;
  }

  // En un lote el nombre (si se escribe) va en todas; el WhatsApp solo vale para una gift card.
  return { ok: true, datos: { tipo, valor, mensaje, para, telefono: cantidad > 1 ? "" : telefono, vence, cantidad } };
}

/**
 * Versión permisiva para la vista previa: mientras alguien escribe, un valor
 * a medias no debe dar error, solo dibujarse lo mejor posible.
 */
export function datosVistaPrevia(q: URLSearchParams): DatosTarjeta {
  const tipo: TipoGiftcard = q.get("tipo") === "porcentaje" ? "porcentaje" : "monto";
  let valor = Math.max(0, Math.round(Number(q.get("valor")) || 0));
  valor = tipo === "porcentaje" ? Math.min(valor, 100) : Math.min(valor, VALOR_MAX_MONTO);
  const venceRaw = q.get("vence") ?? "";
  return {
    codigo: (q.get("codigo") ?? "000000").replace(/[^A-Za-z0-9-]/g, "").slice(0, 16) || "000000",
    tipo,
    valor,
    mensaje: (q.get("mensaje") ?? "").replace(/\s+/g, " ").trim().slice(0, MENSAJE_MAX),
    para: (q.get("para") ?? "").replace(/\s+/g, " ").trim().slice(0, PARA_MAX),
    vence: fechaValida(venceRaw) ? venceRaw : null,
  };
}
