"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gift, MessageCircle, Download, Copy, ExternalLink, Trash2, Check, QrCode, Printer, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { useAdminNav } from "../AdminNavProvider";
import LectorQr from "./LectorQr";
import { puede, type Accion } from "../../../../lib/permisos";
import {
  CANTIDAD_MAX, CONDICIONES, ESTADO_META, MENSAJE_MAX, MENSAJE_POR_DEFECTO, PARA_MAX, VALOR_MAX_MONTO,
  estaVencida, fechaCorta, hoyChile, idDesdeQr, linkWhatsapp, porCodigo, rangoCodigos, soloDigitos, valorTexto,
  type EstadoGiftcard, type Giftcard, type TipoGiftcard,
} from "../../../../lib/giftcards";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px",
  color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", maxWidth: "100%", boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, padding: "10px 16px",
  fontSize: 15, fontWeight: 800, fontFamily: FONT, border: "none", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
};
const btnSec: React.CSSProperties = { ...btnBase, background: SURF2, color: TEXT1, border: `1px solid ${BORDER}`, fontWeight: 700 };

const ATAJOS: Record<TipoGiftcard, number[]> = { monto: [10000, 20000, 30000, 50000], porcentaje: [10, 15, 20, 30, 50] };
const ATAJOS_CANTIDAD = [1, 10, 20, 50];

const FORM_INICIAL = { tipo: "monto" as TipoGiftcard, valor: "", cantidad: "1", mensaje: MENSAJE_POR_DEFECTO, para: "", telefono: "", vence: "" };
type Form = typeof FORM_INICIAL;

type Resultado = { tarjetas: Giftcard[]; lote: string | null };
type Lectura =
  | { tipo: "buscando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "tarjeta"; tarjeta: Giftcard; canjeadaAhora: boolean; aviso?: string };

type Item = { tipo: "una"; g: Giftcard } | { tipo: "lote"; lote: string; tarjetas: Giftcard[] };

function urlPrevia(f: Form) {
  return `/api/giftcards/preview?${new URLSearchParams({ tipo: f.tipo, valor: f.valor, mensaje: f.mensaje, para: f.para, vence: f.vence })}`;
}

function errorDeValor(f: Form): string | null {
  if (!f.valor) return null;
  const n = Number(f.valor);
  if (!Number.isInteger(n) || n <= 0) return "Escribe un número entero mayor a 0";
  if (f.tipo === "porcentaje" && n > 100) return "El descuento no puede superar el 100%";
  if (f.tipo === "monto" && n > VALOR_MAX_MONTO) return `El monto no puede superar $${VALOR_MAX_MONTO.toLocaleString("es-CL")}`;
  return null;
}

function errorDeCantidad(f: Form): string | null {
  const n = Number(f.cantidad);
  if (f.cantidad === "" || !Number.isInteger(n) || n < 1 || n > CANTIDAD_MAX) return `Escribe un número entre 1 y ${CANTIDAD_MAX}`;
  return null;
}

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" });
const fechaDia = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" });

export default function GiftcardsPage() {
  const { rol, permisos } = useAdminNav();
  const puedo = (a: Accion) => puede(rol, permisos, "giftcards", a);

  const [lista, setLista] = useState<Giftcard[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Solo se usa para armar links de las tarjetas, que aparecen después de cargar datos (ya en el navegador).
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const [form, setForm] = useState<Form>(FORM_INICIAL);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [previewSrc, setPreviewSrc] = useState(() => urlPrevia(FORM_INICIAL));
  const ultimaPrevia = useRef(urlPrevia(FORM_INICIAL));
  const [imgCargando, setImgCargando] = useState(true);
  const [imgError, setImgError] = useState(false);

  const [filtro, setFiltro] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<string[]>([]);

  const [escaneando, setEscaneando] = useState(false);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [canjeando, setCanjeando] = useState(false);

  async function cargar() {
    const res = await fetch("/api/giftcards");
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudieron cargar las gift cards"); setCargando(false); return; }
    setLista(await res.json());
    setCargando(false);
  }
  useEffect(() => { (async () => { await cargar(); })(); }, []);

  // La vista previa se pide al servidor (el mismo dibujo que se envía), con una pausa para no pedirla en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      const nueva = urlPrevia(form);
      if (nueva === ultimaPrevia.current) return;
      ultimaPrevia.current = nueva;
      setImgCargando(true);
      setImgError(false);
      setPreviewSrc(nueva);
    }, 400);
    return () => clearTimeout(t);
  }, [form]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const errValor = errorDeValor(form);
  const errCantidad = errorDeCantidad(form);
  const cantidad = errCantidad ? 1 : Number(form.cantidad);
  const esLote = cantidad > 1;
  const formOk = !!form.valor && !errValor && !errCantidad;

  async function crear() {
    setError(null); setAviso(null); setGuardando(true);
    const res = await fetch("/api/giftcards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, valor: Number(form.valor), cantidad }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) { setError(data.error || "No se pudo crear la gift card"); return; }
    setImgCargando(true); setImgError(false);
    setResultado(data);
    setLista(prev => [...(data.tarjetas as Giftcard[]), ...prev]);
  }

  function otra() {
    setResultado(null); setForm(FORM_INICIAL);
    ultimaPrevia.current = urlPrevia(FORM_INICIAL); setPreviewSrc(ultimaPrevia.current);
    setImgCargando(true); setImgError(false); setError(null); setAviso(null);
  }

  /** Reemplaza una tarjeta en todos los lugares donde se muestra. */
  function actualizarLocal(g: Giftcard) {
    setLista(prev => prev.map(x => (x.id === g.id ? g : x)));
    setResultado(r => (r ? { ...r, tarjetas: r.tarjetas.map(x => (x.id === g.id ? g : x)) } : r));
  }

  async function cambiarEstado(g: Giftcard, estado: EstadoGiftcard) {
    setError(null);
    const res = await fetch(`/api/giftcards/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.giftcard) actualizarLocal(data.giftcard);
      setError(data.error || "No se pudo actualizar");
      return;
    }
    actualizarLocal(data);
    setAviso(estado === "canjeada" ? `Gift card ${g.codigo} marcada como canjeada.` : estado === "anulada" ? `Gift card ${g.codigo} anulada.` : `Gift card ${g.codigo} reactivada.`);
  }

  async function eliminar(g: Giftcard) {
    if (!confirm(`¿Eliminar la gift card ${g.codigo}? El link que se envió dejará de funcionar.`)) return;
    const res = await fetch(`/api/giftcards/${g.id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo eliminar"); return; }
    setLista(prev => prev.filter(x => x.id !== g.id));
    if (resultado?.tarjetas.some(x => x.id === g.id)) otra();
  }

  async function copiar(g: Giftcard) {
    try {
      await navigator.clipboard.writeText(`${origin}/giftcard/${g.id}`);
      setCopiado(g.id); setTimeout(() => setCopiado(c => (c === g.id ? null : c)), 2000);
    } catch { setError("No se pudo copiar el link"); }
  }

  // ── Lector de QR y canje ──
  async function consultar(id: string) {
    setLectura({ tipo: "buscando" });
    const res = await fetch(`/api/giftcards/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLectura({ tipo: "error", mensaje: res.status === 404 ? "No encontramos esa gift card. Puede haber sido eliminada." : data.error || "No se pudo consultar la gift card." });
      return;
    }
    setLectura({ tipo: "tarjeta", tarjeta: data, canjeadaAhora: false });
  }

  function alLeer(texto: string) {
    setEscaneando(false);
    const id = idDesdeQr(texto);
    if (!id) { setLectura({ tipo: "error", mensaje: "Ese QR no es de una gift card de Cacho Cabra." }); return; }
    consultar(id);
  }

  function buscarPorNumero(entrada: string): string | null {
    const solo = soloDigitos(entrada);
    const codigo = solo ? solo.padStart(6, "0") : entrada.trim();
    const g = lista.find(x => x.codigo === codigo);
    if (!g) return "No hay ninguna gift card con ese número.";
    setEscaneando(false);
    consultar(g.id);
    return null;
  }

  async function canjear(g: Giftcard) {
    setCanjeando(true);
    const res = await fetch(`/api/giftcards/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: "canjeada" }) });
    const data = await res.json().catch(() => ({}));
    setCanjeando(false);
    if (res.ok) { actualizarLocal(data); setLectura({ tipo: "tarjeta", tarjeta: data, canjeadaAhora: true }); return; }
    if (data.giftcard) { actualizarLocal(data.giftcard); setLectura({ tipo: "tarjeta", tarjeta: data.giftcard, canjeadaAhora: false, aviso: data.error }); return; }
    setLectura({ tipo: "error", mensaje: data.error || "No se pudo canjear la gift card." });
  }

  // ── Historial: un lote se muestra como un solo bloque; buscando, se ven las tarjetas sueltas ──
  const items = useMemo<Item[]>(() => {
    const q = filtro.trim().toLowerCase();
    if (q) return lista.filter(g => g.codigo.toLowerCase().includes(q) || g.para.toLowerCase().includes(q)).map(g => ({ tipo: "una", g }));
    const porLote = new Map<string, Giftcard[]>();
    const out: Item[] = [];
    for (const g of lista) {
      if (!g.lote) { out.push({ tipo: "una", g }); continue; }
      let arr = porLote.get(g.lote);
      if (!arr) { arr = []; porLote.set(g.lote, arr); out.push({ tipo: "lote", lote: g.lote, tarjetas: arr }); }
      arr.push(g);
    }
    out.forEach(i => { if (i.tipo === "lote") i.tarjetas.sort(porCodigo); });
    return out;
  }, [lista, filtro]);

  const accionesTarjeta = (g: Giftcard) => (
    <>
      <a href={linkWhatsapp(g, `${origin}/giftcard/${g.id}`)} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, background: "#25D366", color: "#fff" }}>
        <MessageCircle size={16} /> WhatsApp
      </a>
      <a href={`/api/giftcards/${g.id}/pdf`} download style={btnSec}><Download size={16} /> PDF</a>
      <button onClick={() => copiar(g)} style={btnSec}>{copiado === g.id ? <Check size={16} color={VERDE} /> : <Copy size={16} />} {copiado === g.id ? "Copiado" : "Copiar link"}</button>
      <a href={`/giftcard/${g.id}`} target="_blank" rel="noopener noreferrer" style={btnSec}><ExternalLink size={16} /> Ver</a>
    </>
  );

  const fila = (g: Giftcard) => {
    const vencida = g.estado === "activa" && estaVencida(g);
    const meta = vencida ? { label: "Vencida", color: "#fca5a5", bg: "#2a1212" } : ESTADO_META[g.estado];
    return (
      <div key={g.id} style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: AMR }}>{valorTexto(g.tipo, g.valor)}</span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1.5 }}>N° {g.codigo}</span>
            <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: "2px 10px", fontSize: 13, fontWeight: 800 }}>{meta.label}</span>
            {g.tipo === "monto" && <span title="Lleva código QR" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: TEXT3, fontSize: 13 }}><QrCode size={14} /> QR</span>}
          </div>
          <div style={{ fontSize: 14, color: TEXT3, marginTop: 4 }}>
            {g.para ? `Para ${g.para} · ` : ""}Creada {fechaDia(g.creadaEn)}
            {g.vence ? ` · vence ${fechaCorta(g.vence)}` : ""}{g.canjeadaEn ? ` · canjeada ${fechaHora(g.canjeadaEn)}` : ""}{g.creadaPor && !g.lote ? ` · por ${g.creadaPor}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {accionesTarjeta(g)}
          {puedo("u") && (g.estado === "activa"
            ? <>
                <button onClick={() => cambiarEstado(g, "canjeada")} style={{ ...btnBase, background: "#3a2f10", color: AMR, border: `1px solid ${AMR}` }}>Marcar canjeada</button>
                <button onClick={() => cambiarEstado(g, "anulada")} style={{ ...btnSec, color: "#fca5a5" }}>Anular</button>
              </>
            : <button onClick={() => cambiarEstado(g, "activa")} style={btnSec}>Reactivar</button>)}
          {puedo("d") && <button onClick={() => eliminar(g)} aria-label={`Eliminar ${g.codigo}`} style={{ ...btnSec, color: "#fca5a5" }}><Trash2 size={16} /></button>}
        </div>
      </div>
    );
  };

  const bloqueLote = (lote: string, tarjetas: Giftcard[]) => {
    const abierto = abiertos.includes(lote);
    const primera = tarjetas[0];
    const activas = tarjetas.filter(t => t.estado === "activa").length;
    const canjeadas = tarjetas.filter(t => t.estado === "canjeada").length;
    return (
      <div key={lote} style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: AMR }}>{valorTexto(primera.tipo, primera.valor)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700 }}><Layers size={16} /> Lote de {tarjetas.length} gift cards</span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1.5 }}>N° {rangoCodigos(tarjetas)}</span>
          </div>
          <div style={{ fontSize: 14, color: TEXT3, marginTop: 4 }}>
            {activas} activas · {canjeadas} canjeadas · creado {fechaDia(primera.creadaEn)}{primera.vence ? ` · vence ${fechaCorta(primera.vence)}` : ""}{primera.creadaPor ? ` · por ${primera.creadaPor}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a href={`/api/giftcards/lote/${lote}/pdf`} download style={{ ...btnBase, background: AMR, color: "#1a1200" }}><Printer size={16} /> PDF para imprimir</a>
          <button onClick={() => setAbiertos(a => (a.includes(lote) ? a.filter(x => x !== lote) : [...a, lote]))} style={btnSec}>
            {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {abierto ? "Ocultar tarjetas" : `Ver las ${tarjetas.length} tarjetas`}
          </button>
        </div>
        {abierto && <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>{tarjetas.map(fila)}</div>}
      </div>
    );
  };

  const unica = resultado && resultado.tarjetas.length === 1 ? resultado.tarjetas[0] : null;
  const imagenResultado = resultado ? `/api/giftcards/${resultado.tarjetas[0].id}/image` : null;

  return (
    <div className="adm-page" style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div className="adm-h1" style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}><Gift size={30} color={AMR} /> Gift cards</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Crea gift cards con el estilo de Cacho Cabra, envíalas por WhatsApp o descárgalas en PDF.</div>
        </div>

        {puedo("r") && (
          <button onClick={() => { setLectura(null); setEscaneando(true); }}
            style={{ ...btnBase, width: "100%", padding: "22px 24px", fontSize: 24, fontFamily: TITLE, fontWeight: 900, background: AMR, color: "#1a1200", borderRadius: 16, gap: 14 }}>
            <QrCode size={34} strokeWidth={2.4} /> Leer QR
          </button>
        )}

        {aviso && <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", color: VERDE, borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{aviso}</div>}
        {error && <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{error}</div>}

        {puedo("c") && (
          <div className="adm-grid-1" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>

            {/* ── Formulario ── */}
            <fieldset disabled={!!resultado} style={{ border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 16, padding: 20, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 16, opacity: resultado ? 0.6 : 1 }}>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Diseña tu gift card</div>

              <div>
                <div style={label}>Tipo</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["monto", "porcentaje"] as TipoGiftcard[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t, valor: "" }))}
                      style={{ ...btnBase, flex: 1, background: form.tipo === t ? AMR : SURF2, color: form.tipo === t ? "#1a1200" : TEXT2, border: `1px solid ${form.tipo === t ? AMR : BORDER}` }}>
                      {t === "monto" ? "Monto ($)" : "Descuento (%)"}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: TEXT3, marginTop: 6 }}>{form.tipo === "monto" ? "Las gift cards en $ llevan un código QR para canjearlas." : "Las de descuento no llevan QR: se canjean por su número."}</div>
              </div>

              <div>
                <div style={label}>{form.tipo === "monto" ? "Valor de la gift card" : "Porcentaje de descuento"}</div>
                <div style={{ position: "relative" }}>
                  <input type="number" inputMode="numeric" min={1} max={form.tipo === "porcentaje" ? 100 : VALOR_MAX_MONTO} step={1}
                    value={form.valor} onChange={e => set("valor", e.target.value)}
                    placeholder={form.tipo === "monto" ? "25000" : "20"} style={{ ...inputBase, paddingRight: 38 }} />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontWeight: 700 }}>{form.tipo === "monto" ? "$" : "%"}</span>
                </div>
                {errValor && <div style={{ color: "#fca5a5", fontSize: 14, marginTop: 6 }}>{errValor}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {ATAJOS[form.tipo].map(n => (
                    <button key={n} type="button" onClick={() => set("valor", String(n))}
                      style={{ ...btnSec, padding: "5px 11px", fontSize: 14, borderRadius: 999, background: form.valor === String(n) ? "#3a2f10" : SURF2, color: form.valor === String(n) ? AMR : TEXT2 }}>
                      {valorTexto(form.tipo, n)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={label}>Cantidad de gift cards</div>
                <input type="number" inputMode="numeric" min={1} max={CANTIDAD_MAX} step={1} value={form.cantidad} onChange={e => set("cantidad", e.target.value)} style={inputBase} />
                {errCantidad && <div style={{ color: "#fca5a5", fontSize: 14, marginTop: 6 }}>{errCantidad}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {ATAJOS_CANTIDAD.map(n => (
                    <button key={n} type="button" onClick={() => set("cantidad", String(n))}
                      style={{ ...btnSec, padding: "5px 11px", fontSize: 14, borderRadius: 999, background: form.cantidad === String(n) ? "#3a2f10" : SURF2, color: form.cantidad === String(n) ? AMR : TEXT2 }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: TEXT3, marginTop: 6 }}>
                  {esLote ? `Se crean ${cantidad} gift cards con números correlativos y un PDF para imprimir y recortar (10 por hoja).` : "Con más de 1 se crea un lote con números correlativos y un PDF para imprimir."}
                </div>
              </div>

              <div>
                <div style={{ ...label, display: "flex", justifyContent: "space-between" }}><span>Mensaje</span><span style={{ fontWeight: 500 }}>{form.mensaje.length}/{MENSAJE_MAX}</span></div>
                <textarea rows={3} maxLength={MENSAJE_MAX} value={form.mensaje} onChange={e => set("mensaje", e.target.value)} placeholder="Escribe un mensaje para quien la recibe" style={{ ...inputBase, resize: "vertical" }} />
              </div>

              <div>
                <div style={label}>Para (opcional)</div>
                <input value={form.para} maxLength={PARA_MAX} onChange={e => set("para", e.target.value)} placeholder="Nombre de quien la recibe" style={inputBase} />
                {esLote && <div style={{ fontSize: 13, color: TEXT3, marginTop: 5 }}>Si lo escribes, aparece en todas las tarjetas del lote.</div>}
              </div>

              {!esLote && (
                <>

                  <div>
                    <div style={label}>WhatsApp (opcional)</div>
                    <input type="tel" inputMode="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="9 1234 5678" style={inputBase} />
                    <div style={{ fontSize: 13, color: TEXT3, marginTop: 5 }}>Si lo dejas vacío, eliges el contacto al momento de enviar.</div>
                  </div>
                </>
              )}

              <div>
                <div style={label}>Válida hasta (opcional)</div>
                <input type="date" min={hoyChile()} value={form.vence} onChange={e => set("vence", e.target.value)} style={inputBase} />
              </div>

              <div style={{ fontSize: 13, color: TEXT3, borderLeft: `3px solid ${AMR}`, paddingLeft: 10 }}>{CONDICIONES}</div>

              <button type="button" onClick={crear} disabled={!formOk || guardando}
                style={{ ...btnBase, background: AMR, color: "#1a1200", fontSize: 17, padding: "13px 16px", opacity: !formOk || guardando ? 0.5 : 1, cursor: !formOk || guardando ? "not-allowed" : "pointer" }}>
                {guardando ? "Generando…" : esLote ? `Generar ${cantidad} gift cards` : "Generar gift card"}
              </button>
            </fieldset>

            {/* ── Vista previa y acciones ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, position: "sticky", top: 16 }}>
              <div style={{ position: "relative", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", aspectRatio: "1200 / 630" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={imagenResultado ?? "previa"} src={imagenResultado ?? previewSrc} alt="Vista previa de la gift card"
                  onLoad={() => setImgCargando(false)} onError={() => { setImgCargando(false); setImgError(true); }}
                  style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", opacity: imgCargando ? 0.45 : 1, transition: "opacity 0.2s" }} />
                {imgCargando && !resultado && (
                  <div style={{ position: "absolute", right: 12, top: 12, background: "rgba(0,0,0,0.65)", color: TEXT1, borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>Actualizando…</div>
                )}
                {imgError && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fca5a5", fontSize: 16, padding: 16, textAlign: "center" }}>No se pudo dibujar la vista previa. Revisa los datos e intenta de nuevo.</div>}
              </div>

              {resultado ? (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  {unica ? (
                    <>
                      <div>
                        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>¡Gift card lista!</div>
                        <div style={{ fontSize: 15, color: TEXT3 }}>N° <strong style={{ color: AMR, letterSpacing: 1 }}>{unica.codigo}</strong> · {valorTexto(unica.tipo, unica.valor)}{unica.vence ? ` · hasta ${fechaCorta(unica.vence)}` : ""}</div>
                      </div>
                      <div className="adm-stack" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{accionesTarjeta(unica)}</div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>¡{resultado.tarjetas.length} gift cards listas!</div>
                        <div style={{ fontSize: 15, color: TEXT3 }}>N° <strong style={{ color: AMR, letterSpacing: 1 }}>{rangoCodigos(resultado.tarjetas)}</strong> · {valorTexto(resultado.tarjetas[0].tipo, resultado.tarjetas[0].valor)} cada una{resultado.tarjetas[0].vence ? ` · hasta ${fechaCorta(resultado.tarjetas[0].vence)}` : ""}</div>
                        <div style={{ fontSize: 14, color: TEXT3, marginTop: 4 }}>La imagen es de ejemplo (la primera). Cada tarjeta lleva su propio número{resultado.tarjetas[0].tipo === "monto" ? " y su propio QR" : ""}.</div>
                      </div>
                      <div className="adm-stack" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <a href={`/api/giftcards/lote/${resultado.lote}/pdf`} download style={{ ...btnBase, background: AMR, color: "#1a1200", fontSize: 17, padding: "13px 20px" }}>
                          <Printer size={18} /> Descargar PDF para imprimir ({resultado.tarjetas.length})
                        </a>
                      </div>
                      <div style={{ fontSize: 14, color: TEXT3 }}>10 tarjetas por hoja A4, con guías para recortar. También las ves una por una en el historial, abajo.</div>
                    </>
                  )}
                  <button type="button" onClick={otra} style={{ ...btnSec, alignSelf: "flex-start" }}>+ Crear {unica ? "otra gift card" : "otro lote"}</button>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: TEXT3 }}>Así se verá la gift card{form.tipo === "monto" ? " (el QR de la imagen es de muestra: cada tarjeta lleva el suyo)" : ""}. Al generarla se le asigna su número y podrás enviarla por WhatsApp o descargarla en PDF.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Historial ── */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Gift cards creadas</div>
              <div style={{ fontSize: 15, color: TEXT3 }}>{lista.length} en total · {lista.filter(g => g.estado === "activa").length} activas</div>
            </div>
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por número o nombre" style={{ ...inputBase, width: 260 }} />
          </div>

          {cargando ? <div style={{ color: TEXT3 }}>Cargando…</div>
            : items.length === 0 ? <div style={{ color: TEXT3 }}>{lista.length === 0 ? "Aún no hay gift cards." : "No hay resultados para esa búsqueda."}</div>
            : items.map(i => (i.tipo === "una" ? fila(i.g) : bloqueLote(i.lote, i.tarjetas)))}
        </div>
      </div>

      {escaneando && <LectorQr onLectura={alLeer} onCodigo={buscarPorNumero} onCerrar={() => setEscaneando(false)} />}

      {lectura && (
        <div role="dialog" aria-modal="true" aria-label="Resultado de la lectura"
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16, maxHeight: "95vh", overflowY: "auto" }}>
            {lectura.tipo === "buscando" && <div style={{ color: TEXT3, fontSize: 18, textAlign: "center", padding: 24 }}>Buscando gift card…</div>}

            {lectura.tipo === "error" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fca5a5", fontSize: 18, fontWeight: 800 }}><AlertTriangle size={26} /> No se pudo leer</div>
                <div style={{ fontSize: 16, color: TEXT2 }}>{lectura.mensaje}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => { setLectura(null); setEscaneando(true); }} style={{ ...btnBase, background: AMR, color: "#1a1200" }}><QrCode size={18} /> Leer otro QR</button>
                  <button onClick={() => setLectura(null)} style={btnSec}>Cerrar</button>
                </div>
              </>
            )}

            {lectura.tipo === "tarjeta" && (() => {
              const t = lectura.tarjeta;
              const vencida = t.estado === "activa" && estaVencida(t);
              const usable = t.estado === "activa" && !vencida;
              const estadoTexto =
                lectura.canjeadaAhora ? { ok: true, texto: "¡Gift card canjeada!" }
                : t.estado === "canjeada" ? { ok: false, texto: `Ya fue canjeada${t.canjeadaEn ? ` el ${fechaHora(t.canjeadaEn)}` : ""}.` }
                : t.estado === "anulada" ? { ok: false, texto: "Esta gift card está anulada." }
                : vencida ? { ok: false, texto: `Esta gift card venció el ${fechaCorta(t.vence)}.` }
                : { ok: true, texto: "Gift card válida." };
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: estadoTexto.ok ? VERDE : "#fca5a5", fontSize: 20, fontWeight: 900, fontFamily: TITLE }}>
                    {estadoTexto.ok ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />} {estadoTexto.texto}
                  </div>
                  {lectura.aviso && !estadoTexto.ok && <div style={{ fontSize: 14, color: TEXT3 }}>{lectura.aviso}</div>}

                  <div style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, textAlign: "center" }}>
                    <div style={{ fontFamily: TITLE, fontSize: 46, fontWeight: 900, color: AMR, lineHeight: 1.1 }}>{valorTexto(t.tipo, t.valor)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, marginTop: 6 }}>N° {t.codigo}</div>
                    <div style={{ fontSize: 14, color: TEXT3, marginTop: 8 }}>
                      {t.para ? `Para ${t.para} · ` : ""}{t.vence ? `Válida hasta ${fechaCorta(t.vence)}` : "Sin vencimiento"}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: TEXT2, borderLeft: `3px solid ${AMR}`, paddingLeft: 10 }}>{CONDICIONES}</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {usable && puedo("u") && !lectura.canjeadaAhora && (
                      <button onClick={() => canjear(t)} disabled={canjeando}
                        style={{ ...btnBase, flex: 1, background: VERDE, color: "#06281c", fontSize: 18, padding: "16px 18px", opacity: canjeando ? 0.6 : 1 }}>
                        {canjeando ? "Canjeando…" : `Canjear ${valorTexto(t.tipo, t.valor)} ahora`}
                      </button>
                    )}
                    {usable && !puedo("u") && <div style={{ fontSize: 14, color: TEXT3 }}>No tienes permiso para canjear gift cards.</div>}
                    <button onClick={() => { setLectura(null); setEscaneando(true); }} style={btnSec}><QrCode size={16} /> Leer otro QR</button>
                    <button onClick={() => setLectura(null)} style={btnSec}>Cerrar</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
