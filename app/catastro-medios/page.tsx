"use client";

import { useState } from "react";
import Image from "next/image";

type EstMedia = "listo" | "pendiente" | "en-produccion";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  foto: EstMedia;
  video: EstMedia;
  driveLink?: string;
  notas?: string;
}

const BG      = "#2d2b27";
const SURFACE = "#383430";
const SURF2   = "#433f3a";
const BORDER  = "#504b46";
const TEXT1   = "#f5f2ee";
const TEXT2   = "#d8d2cc";
const TEXT3   = "#b0a89f";
const AMR     = "#FBBF24";
const VERDE   = "#34d399";
const ROJO    = "#f05252";
const AZUL    = "#60a5fa";
const FONT    = "var(--font-dm), sans-serif";
const TITLE   = "var(--font-raleway), sans-serif";

const EST_MEDIA: Record<EstMedia, { label: string; color: string; bg: string }> = {
  listo:         { label: "Listo",          color: VERDE, bg: "#1a2e1a" },
  "en-produccion": { label: "En producción", color: AMR,   bg: "#1e1a0e" },
  pendiente:     { label: "Pendiente",      color: "#706860", bg: SURFACE },
};

const CATEGORIAS_META: Record<string, { emoji: string; color: string }> = {
  "Cafetería":   { emoji: "☕", color: "#c4914f" },
  "Comida":      { emoji: "🍽️", color: "#f87171" },
  "Tragos":      { emoji: "🍹", color: "#a78bfa" },
  "Postres":     { emoji: "🍰", color: "#f9a8d4" },
};

const PRODUCTOS_BASE: Producto[] = [
  // ── CAFETERÍA ──
  { id: "ca01", nombre: "Espresso",              categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca02", nombre: "Cappuccino",             categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca03", nombre: "Latte Art",              categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca04", nombre: "Latte de especialidad",  categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca05", nombre: "Cold Brew",              categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca06", nombre: "Brunch del día",         categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca07", nombre: "Tostadas de palta",      categoria: "Cafetería", foto: "pendiente", video: "pendiente" },
  { id: "ca08", nombre: "Bowl de fruta y granola",categoria: "Cafetería", foto: "pendiente", video: "pendiente" },

  // ── COMIDA ──
  { id: "co01", nombre: "Ceviche de Cacho",        categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co02", nombre: "Ostiones Parmesana",      categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co03", nombre: "Pastel de Jaiba",         categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co04", nombre: "Ñoquis a la Huaicaína",   categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co05", nombre: "Pil-Pil de Camarón",      categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co06", nombre: "Sushi Rolls (tabla)",     categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co07", nombre: "Tabla Cachito de la Casa",categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co08", nombre: "Pizza seleccionada",      categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co09", nombre: "Hamburguesa Cacho",       categoria: "Comida", foto: "pendiente", video: "pendiente" },
  { id: "co10", nombre: "Sugerencias del Chef",     categoria: "Comida", foto: "pendiente", video: "pendiente" },

  // ── TRAGOS ──
  { id: "tr01", nombre: "Gin Barbie",              categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr02", nombre: "Spritz de la Casa",       categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr03", nombre: "Pisco Sour artesanal",    categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr04", nombre: "Mojito Cacho",            categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr05", nombre: "Margarita de autor",      categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr06", nombre: "Ramazzotti (promo)",      categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr07", nombre: "Cocktail Cena Italiana",  categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr08", nombre: "Cocktail Cena Mexicana",  categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr09", nombre: "Shot recomendado del día",categoria: "Tragos", foto: "pendiente", video: "pendiente" },
  { id: "tr10", nombre: "Cerveza artesanal",       categoria: "Tragos", foto: "pendiente", video: "pendiente" },

  // ── POSTRES ──
  { id: "po01", nombre: "Torta de la Casa",        categoria: "Postres", foto: "pendiente", video: "pendiente" },
  { id: "po02", nombre: "Cheesecake de berries",   categoria: "Postres", foto: "pendiente", video: "pendiente" },
  { id: "po03", nombre: "Brownie con helado",      categoria: "Postres", foto: "pendiente", video: "pendiente" },
  { id: "po04", nombre: "Postre del día",          categoria: "Postres", foto: "pendiente", video: "pendiente" },
];

export default function CatastroMediosPage() {
  const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_BASE);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<Record<string, string>>({});
  const [filtroEst, setFiltroEst] = useState<"todos" | EstMedia>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("Todos");
  const [agrNombre, setAgrNombre] = useState("");
  const [agrCat, setAgrCat]       = useState("Comida");

  function setEstMedia(id: string, campo: "foto" | "video", val: EstMedia) {
    setProductos(prev => prev.map(p => p.id !== id ? p : { ...p, [campo]: val }));
  }

  function guardarLink(id: string) {
    const link = editLinks[id] ?? "";
    setProductos(prev => prev.map(p => p.id !== id ? p : { ...p, driveLink: link }));
    setEditId(null);
  }

  function agregarProducto() {
    if (!agrNombre.trim()) return;
    const id = `custom-${Date.now()}`;
    setProductos(prev => [...prev, { id, nombre: agrNombre.trim(), categoria: agrCat, foto: "pendiente", video: "pendiente" }]);
    setAgrNombre("");
  }

  const cats = ["Todos", ...Object.keys(CATEGORIAS_META)];
  const filtered = productos.filter(p => {
    const catOk = filtroCat === "Todos" || p.categoria === filtroCat;
    const estOk = filtroEst === "todos" ||
      (filtroEst === "pendiente" && (p.foto === "pendiente" || p.video === "pendiente")) ||
      (filtroEst === "listo" && p.foto === "listo" && p.video === "listo") ||
      (filtroEst === "en-produccion" && (p.foto === "en-produccion" || p.video === "en-produccion"));
    return catOk && estOk;
  });

  const totalP    = productos.length;
  const fotoLista = productos.filter(p => p.foto === "listo").length;
  const vidListo  = productos.filter(p => p.video === "listo").length;
  const completos = productos.filter(p => p.foto === "listo" && p.video === "listo").length;

  // Agrupar por categoría para la vista
  const porCategoria: Record<string, Producto[]> = {};
  filtered.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1 }}>

      {/* HEADER */}
      <header className="ws-header" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="ws-header-inner" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={160} height={56} style={{ height: "auto" }} loading="eager" />
            <div className="ws-header-right" style={{ textAlign: "right" }}>
              <div className="ws-header-title" style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: TEXT1, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Catastro de Medios
              </div>
              <div style={{ fontSize: 15, color: TEXT3, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                fotos · videos · drive · v1 · jun 2026
              </div>
            </div>
          </div>
          <div style={{ fontSize: 17, color: TEXT2, lineHeight: 1.7, maxWidth: 600 }}>
            Seguimiento del estado de fotos y videos por producto. Marca cada ítem como pendiente, en producción o listo. Agrega el link de Drive con la carpeta específica.
          </div>
        </div>
      </header>

      <div className="ws-main" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>

        {/* STATS */}
        <div className="ws-stats">
          {[
            { num: totalP,    label: "Productos",    color: TEXT1  },
            { num: fotoLista, label: "Fotos listas", color: VERDE  },
            { num: vidListo,  label: "Videos listos",color: AZUL   },
            { num: completos, label: "Completos",    color: AMR    },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 22px" }}>
              <div style={{ fontFamily: TITLE, fontSize: "clamp(2.4rem,4vw,3.2rem)", fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.num}</div>
              <div style={{ fontSize: 14, color: TEXT3, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BARRAS DE PROGRESO */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Fotos", done: fotoLista, total: totalP, color: VERDE },
            { label: "Videos", done: vidListo, total: totalP, color: AZUL  },
          ].map(b => (
            <div key={b.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: TEXT2 }}>{b.label}</span>
                <span style={{ fontSize: 16, color: TEXT3 }}>{b.done}/{b.total} · {b.total > 0 ? Math.round((b.done / b.total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div style={{ height: "100%", width: `${b.total > 0 ? (b.done / b.total) * 100 : 0}%`, background: b.color, borderRadius: 99, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* LEYENDA */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {(Object.entries(EST_MEDIA) as [EstMedia, typeof EST_MEDIA[EstMedia]][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 99, background: v.color }} />
              <span style={{ fontSize: 15, color: TEXT2 }}>{v.label}</span>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, padding: "4px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, alignSelf: "flex-start", flexWrap: "wrap" }}>
            {cats.map(c => (
              <button key={c} onClick={() => setFiltroCat(c)}
                style={{
                  fontFamily: FONT, fontSize: 15, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: filtroCat === c ? AMR : "transparent",
                  color: filtroCat === c ? "#1a1200" : TEXT3,
                  transition: "all 0.15s",
                }}>
                {c === "Todos" ? "Todos" : `${CATEGORIAS_META[c]?.emoji} ${c}`}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "4px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, alignSelf: "flex-start", flexWrap: "wrap" }}>
            {([["todos", "Todos"], ["pendiente", "Pendientes"], ["en-produccion", "En producción"], ["listo", "Listos"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFiltroEst(v)}
                style={{
                  fontFamily: FONT, fontSize: 15, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: filtroEst === v ? AMR : "transparent",
                  color: filtroEst === v ? "#1a1200" : TEXT3,
                  transition: "all 0.15s",
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* TABLA POR CATEGORÍA */}
        {Object.entries(porCategoria).map(([cat, prods]) => {
          const catMeta = CATEGORIAS_META[cat] ?? { emoji: "📦", color: TEXT3 };
          return (
            <div key={cat}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 26 }}>{catMeta.emoji}</span>
                <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, color: TEXT1 }}>{cat}</div>
                <span style={{ fontSize: 15, color: TEXT3 }}>{prods.length} productos</span>
              </div>
              <div className="ws-table-wrap" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                {/* Cabecera tabla — oculta en mobile */}
                <div className="ws-table-head" style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 1fr 44px", gap: 0, padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, background: SURF2 }}>
                  {["Producto", "Foto", "Video", "Drive / Carpeta", ""].map(h => (
                    <div key={h} style={{ fontSize: 13, fontWeight: 700, color: TEXT3, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>
                {/* Filas */}
                {prods.map((prod, idx) => {
                  const isEditing = editId === prod.id;
                  const completo = prod.foto === "listo" && prod.video === "listo";
                  return (
                    <div key={prod.id} className="ws-table-row" style={{
                      display: "grid", gridTemplateColumns: "1fr 120px 120px 1fr 44px",
                      alignItems: "center", gap: 0, padding: "14px 20px",
                      borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`,
                      background: completo ? "#1a2e1a22" : "transparent",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => { if (!completo) e.currentTarget.style.background = SURF2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = completo ? "#1a2e1a22" : "transparent"; }}
                    >
                      {/* Nombre + status icon (mobile: todo junto) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>
                          {completo ? "✅" : prod.foto === "pendiente" && prod.video === "pendiente" ? "⭕" : "🔄"}
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 600, color: TEXT1 }}>{prod.nombre}</span>
                      </div>

                      {/* Foto */}
                      <div className="ws-table-col-badge">
                        <span style={{ fontSize: 13, color: TEXT3, fontWeight: 600, display: "none" }} className="ws-mobile-label">📸</span>
                        <select value={prod.foto} onChange={e => setEstMedia(prod.id, "foto", e.target.value as EstMedia)}
                          style={{
                            background: EST_MEDIA[prod.foto].bg, color: EST_MEDIA[prod.foto].color,
                            border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 8px",
                            fontSize: 14, fontFamily: FONT, cursor: "pointer", outline: "none", maxWidth: "100%",
                          }}>
                          {(Object.entries(EST_MEDIA) as [EstMedia, typeof EST_MEDIA[EstMedia]][]).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: "#2d2b27", color: v.color }}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Video */}
                      <div className="ws-table-col-badge">
                        <select value={prod.video} onChange={e => setEstMedia(prod.id, "video", e.target.value as EstMedia)}
                          style={{
                            background: EST_MEDIA[prod.video].bg, color: EST_MEDIA[prod.video].color,
                            border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 8px",
                            fontSize: 14, fontFamily: FONT, cursor: "pointer", outline: "none", maxWidth: "100%",
                          }}>
                          {(Object.entries(EST_MEDIA) as [EstMedia, typeof EST_MEDIA[EstMedia]][]).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: "#2d2b27", color: v.color }}>{v.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Drive */}
                      <div className="ws-table-col-drive">
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <input
                              type="text"
                              placeholder="https://drive.google.com/..."
                              value={editLinks[prod.id] ?? prod.driveLink ?? ""}
                              onChange={e => setEditLinks(prev => ({ ...prev, [prod.id]: e.target.value }))}
                              style={{ flex: 1, minWidth: 140, background: SURF2, border: `1px solid ${AMR}`, borderRadius: 8, padding: "4px 10px", fontSize: 14, fontFamily: FONT, color: TEXT1, outline: "none" }}
                              onKeyDown={e => e.key === "Enter" && guardarLink(prod.id)}
                              autoFocus
                            />
                            <button onClick={() => guardarLink(prod.id)} style={{ fontSize: 14, background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: FONT, fontWeight: 700 }}>OK</button>
                            <button onClick={() => setEditId(null)} style={{ fontSize: 14, background: "none", color: TEXT3, border: "none", cursor: "pointer", fontFamily: FONT }}>✕</button>
                          </div>
                        ) : prod.driveLink ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <a href={prod.driveLink} target="_blank" rel="noreferrer"
                              style={{ fontSize: 15, color: AZUL, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                              📁 Ver
                            </a>
                            <button onClick={() => { setEditId(prod.id); setEditLinks(prev => ({ ...prev, [prod.id]: prod.driveLink ?? "" })); }}
                              style={{ fontSize: 13, color: TEXT3, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>editar</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditId(prod.id)}
                            style={{ fontSize: 14, color: TEXT3, background: SURF2, border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                            + Drive
                          </button>
                        )}
                      </div>

                      {/* Status icon — solo desktop */}
                      <div className="ws-table-head" style={{ display: "flex", justifyContent: "center" }}>
                        {completo ? "✅" : prod.foto === "pendiente" && prod.video === "pendiente" ? <span style={{ opacity: 0.3 }}>⭕</span> : "🔄"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* AGREGAR PRODUCTO */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 800, color: TEXT1, marginBottom: 16 }}>
            + Agregar producto al catastro
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text" placeholder="Nombre del producto..."
              value={agrNombre} onChange={e => setAgrNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregarProducto()}
              style={{ flex: 1, minWidth: 200, background: SURF2, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 16, fontFamily: FONT, color: TEXT1, outline: "none" }}
              onFocus={e => (e.target.style.borderColor = AMR)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <select value={agrCat} onChange={e => setAgrCat(e.target.value)}
              style={{ background: SURF2, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 16, fontFamily: FONT, color: TEXT1, outline: "none" }}>
              {Object.keys(CATEGORIAS_META).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={agregarProducto}
              style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 16, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
              Agregar
            </button>
          </div>
          <div style={{ fontSize: 15, color: TEXT3, marginTop: 10 }}>
            Al agregar un producto aquí, recuerda también crearlo en el menú admin para que quede sincronizado en el sistema.
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ textAlign: "center", paddingBottom: 48, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 15, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Cacho &amp; Cabra · Catastro de Medios · cúbicos · v1 · 2026
          </div>
        </footer>
      </div>
    </div>
  );
}
