"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { resolverImagen } from "../../lib/imagenes";

// ─── tipos ─────────────────────────────────────────────────────────
type Categoria = "todo" | "chef" | "cafeteria" | "brunch" | "comida" | "tragos" | "postres";
type Tema      = "oscuro" | "claro";
type FontSize  = "normal" | "grande" | "extra";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Omit<Categoria, "todo">;
  subcategoria?: string;
  foto: string;
  badge?: string;
  popular?: boolean;
  disponible?: boolean;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
}


const CATEGORIAS: { id: Categoria; label: string; emoji: string }[] = [
  { id:"comida",    label:"Comida",              emoji:"🍽️" },
  { id:"tragos",    label:"Tragos",              emoji:"🍹"  },
  { id:"cafeteria", label:"Cafetería",           emoji:"☕"  },
];

function fmtPrecio(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Las sugerencias del chef son un especial de fin de semana: solo se
// muestran viernes, sábado y domingo, y solo si el admin las publicó.
function esFinDeSemanaChef() {
  const dia = new Date().getDay(); // 0=domingo, 5=viernes, 6=sábado
  return dia === 0 || dia === 5 || dia === 6;
}

const FONT_SCALE: Record<FontSize, number> = { normal:1.25, grande:1.4, extra:1.55 };

// ─── page ──────────────────────────────────────────────────────────
export default function CartaPage() {
  const [cat,      setCat]      = useState<Categoria>("comida");
  const [busqueda, setBusqueda] = useState("");
  const [tema,     setTema]     = useState<Tema>("oscuro");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [cart,     setCart]     = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const [pedidoModal, setPedido]= useState(false);
  const [mesa,     setMesa]     = useState("");
  const [nombre,   setNombre]   = useState("");
  const [success,  setSuccess]  = useState(false);
  const [notas,    setNotas]    = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [enviando,  setEnviando]  = useState(false);
  const [errorPedido, setErrorPedido] = useState("");
  const [registroModal, setRegistroModal] = useState(false);
  const [email,    setEmail]    = useState("");
  const [telefono, setTelefono] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState("");

  useEffect(() => {
    fetch("/api/productos")
      .then(r => r.json())
      .then((data: Producto[]) => setProductos(Array.isArray(data) ? data.filter(p => p.disponible !== false) : []))
      .finally(() => setCargando(false));
  }, []);

  const os = tema === "oscuro";
  const fs = FONT_SCALE[fontSize];

  // tokens dinámicos
  const T = {
    bg:      os ? "#1e1c19" : "#f8f6f2",
    surface: os ? "#2d2b27" : "#ffffff",
    surf2:   os ? "#383430" : "#f0ede8",
    border:  os ? "#504b46" : "#ddd8d0",
    text1:   os ? "#f5f2ee" : "#1a1816",
    text2:   os ? "#d8d2cc" : "#3d3830",
    text3:   os ? "#b0a89f" : "#8a8078",
    amr:     "#FBBF24",
    rojo:    "#f05252",
    verde:   "#34d399",
  };

  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = cart.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);

  function addToCart(p: Producto) {
    setCart(prev => {
      const ex = prev.find(i => i.producto.id === p.id);
      if (ex) return prev.map(i => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto: p, cantidad: 1 }];
    });
    setCartBump(true);
    setTimeout(() => setCartBump(false), 400);
  }
  function removeOne(id: string) {
    setCart(prev => prev.map(i => i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i).filter(i => i.cantidad > 0));
  }
  function removeAll(id: string) {
    setCart(prev => prev.filter(i => i.producto.id !== id));
  }

  async function hacerPedido() {
    if (!mesa.trim() || enviando) return;
    setEnviando(true);
    setErrorPedido("");
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mesa: mesa.trim(),
          nombre: nombre.trim(),
          notas: notas.trim(),
          items: cart.map(i => ({
            producto_id: i.producto.id,
            nombre: i.producto.nombre,
            categoria: i.producto.categoria,
            cantidad: i.cantidad,
            precio: i.producto.precio,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      setPedido(false);
      setCart([]);
      setMesa(""); setNombre(""); setNotas("");
      setRegistroModal(true);
      setEmail(""); setTelefono("");
    } catch {
      setErrorPedido("No se pudo enviar el pedido. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function hacerRegistro() {
    if (!email.trim() || !telefono.trim() || registrando) return;
    setRegistrando(true);
    setErrorRegistro("");
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim() || "Cliente",
          email: email.trim(),
          telefono: telefono.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setRegistroModal(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 6000);
    } catch {
      setErrorRegistro("No se pudo completar el registro. Intenta de nuevo.");
    } finally {
      setRegistrando(false);
    }
  }

  const chefProductos = productos.filter(p => p.categoria === "chef");
  const mostrarChef = esFinDeSemanaChef() && chefProductos.length > 0;
  const categoriasVisibles = CATEGORIAS.filter(c => c.id !== "chef" || mostrarChef);

  // La pestaña "Cafetería" agrupa el menú completo de esa carta impresa:
  // bebidas (categoria=cafeteria), salados de brunch (categoria=brunch) y
  // pastelería/postres (categoria=postres).
  const porCategoria = cat === "todo"
    ? productos
    : cat === "cafeteria"
      ? productos.filter(p => p.categoria === "brunch" || p.categoria === "cafeteria" || p.categoria === "postres")
      : productos.filter(p => p.categoria === cat);
  const q = busqueda.trim().toLowerCase();
  // Con texto en el buscador, se busca en TODA la carta (no solo en la pestaña activa).
  const filtered = q === ""
    ? porCategoria
    : productos.filter(p => p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));

  // Agrupa productos consecutivos de la misma subcategoría (ya vienen ordenados así desde la BD).
  // Grupos con más de 3 productos llevan un banner con foto arriba.
  const grupos: { subcategoria: string | null; items: Producto[] }[] = [];
  for (const p of filtered) {
    const key = p.subcategoria || null;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.subcategoria === key) ultimo.items.push(p);
    else grupos.push({ subcategoria: key, items: [p] });
  }

  // Subcategorías únicas de la categoría activa, en el orden en que aparecen, para el selector de salto rápido.
  const subcategoriasDisponibles = [...new Set(porCategoria.map(p => p.subcategoria).filter(Boolean))] as string[];

  function irASubcategoria(sub: string) {
    const el = document.getElementById(`grupo-${slugify(sub)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "var(--font-dm), sans-serif", color: T.text1, transition: "background 0.3s, color 0.3s" }}>

      {/* ── HEADER: scrollea normal, no se queda pegado ── */}
      <div>
        <header style={{ borderBottom: `1px solid ${T.border}`, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, backdropFilter: "blur(8px)", flexWrap: "wrap" }}>

          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, textDecoration: "none" }}>
            <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={176} height={140} style={{ objectFit: "contain" }} />
            <span style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 26, fontWeight: 900, color: T.text1 }}>
              Carta
            </span>
          </a>

          {/* Controles */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>

            {/* Tema */}
            <button onClick={() => setTema(t => t === "oscuro" ? "claro" : "oscuro")}
              title={tema === "oscuro" ? "Cambiar a fondo claro" : "Cambiar a fondo oscuro"}
              style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontSize: 18, color: T.text2, display: "flex", alignItems: "center", gap: 6 }}>
              {tema === "oscuro" ? "☀️" : "🌙"}
            </button>

            {/* Font size */}
            <div style={{ display: "flex", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              {(["normal","grande","extra"] as FontSize[]).map((s, i) => (
                <button key={s} onClick={() => setFontSize(s)}
                  style={{
                    padding: "7px 10px", border: "none", cursor: "pointer", fontFamily: "var(--font-dm),sans-serif",
                    background: fontSize === s ? T.amr : "transparent",
                    color: fontSize === s ? "#1a1200" : T.text3,
                    fontSize: [12, 14, 16][i], fontWeight: 700,
                    borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
                  }}>
                  A
                </button>
              ))}
            </div>

          </div>
        </header>

      </div>

      {/* ── BUSCADOR + TABS: esto sí se queda pegado arriba al hacer scroll ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px 0" }}>
          {/* Buscador */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: T.text3 }}>🔍</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en la carta…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 16px 12px 42px", borderRadius: 12,
                background: T.surf2, border: `1px solid ${T.border}`, color: T.text1,
                fontFamily: "var(--font-dm), sans-serif", fontSize: `${14 * fs}px`, outline: "none",
              }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 16 }}>
                ✕
              </button>
            )}
          </div>

          {/* Category tabs + salto directo a subcategoría */}
          <style>{`
            .carta-tabs-row { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; }
            .carta-ir-a { flex-shrink: 0; max-width: 150px; }
            @media (max-width: 560px) {
              .carta-tabs-row { flex-wrap: wrap; padding-bottom: 8px; }
              .carta-ir-a { max-width: none; width: 100%; order: 3; margin-top: 4px; }
            }
          `}</style>
          <div className="carta-tabs-row">
            <div style={{
              display: "flex", gap: 18, overflowX: "auto", overflowY: "hidden",
              flex: 1, minWidth: 0,
              WebkitOverflowScrolling: "touch" as never,
            }}>
              {categoriasVisibles.map(c => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  style={{
                    padding: "10px 2px", background: "none", cursor: "pointer", whiteSpace: "nowrap",
                    border: "none", borderBottom: `2px solid ${cat === c.id ? T.amr : "transparent"}`,
                    fontFamily: "var(--font-dm), sans-serif", fontSize: `${14 * fs}px`,
                    fontWeight: cat === c.id ? 800 : 600,
                    color: cat === c.id ? T.amr : T.text3,
                    transition: "all 0.15s", marginBottom: -1,
                  }}>
                  {c.label}
                </button>
              ))}
            </div>

            {subcategoriasDisponibles.length > 0 && (
              <select
                className="carta-ir-a"
                value=""
                onChange={e => { if (e.target.value) irASubcategoria(e.target.value); }}
                style={{
                  background: T.surf2, border: `1px solid ${T.border}`,
                  color: T.text2, borderRadius: 10, padding: "8px 10px", boxSizing: "border-box",
                  fontFamily: "var(--font-dm), sans-serif", fontSize: `${13 * fs}px`, cursor: "pointer", outline: "none",
                }}>
                <option value="">Ir a…</option>
                {subcategoriasDisponibles.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Sugerencias del Chef — especial de fin de semana, solo si el admin publicó algo */}
          {mostrarChef && (
            <div style={{
              marginBottom: 24, borderRadius: 20, padding: "20px 22px",
              background: os
                ? "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(240,82,82,0.08))"
                : "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(240,82,82,0.06))",
              border: `1.5px solid ${T.amr}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>👨‍🍳</span>
                <div>
                  <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: `${20 * fs}px`, fontWeight: 900, color: T.text1 }}>
                    Sugerencias del Chef
                  </div>
                  <div style={{ fontSize: `${13 * fs}px`, color: T.text3, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Especial de fin de semana
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" as never }}>
                {chefProductos.map(p => {
                  const enCart = cart.find(i => i.producto.id === p.id)?.cantidad ?? 0;
                  return (
                    <div key={p.id} style={{ minWidth: 230, flexShrink: 0 }}>
                      <ProductoCard p={p} enCart={enCart} tema={T} fs={fs}
                        onAdd={() => addToCart(p)} onRemove={() => removeOne(p.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contador */}
          <div style={{ fontSize: 14, color: T.text3, letterSpacing: "0.04em", marginBottom: 20 }}>
            {filtered.length} productos
          </div>

          {/* Productos */}
          {cargando ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: T.text3 }}>Cargando carta…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grupos.map((grupo, gi) => (
                <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                  {grupo.subcategoria && (
                    <div id={`grupo-${slugify(grupo.subcategoria)}`} style={{
                      width: "100%", height: 150, borderRadius: 14, overflow: "hidden", position: "relative",
                      marginTop: gi > 0 ? 10 : 0, flexShrink: 0, scrollMarginTop: 140,
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolverImagen(grupo.items[0].foto, 1600, 300)} alt={grupo.subcategoria}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.05) 100%)" }} />
                      <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
                        <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${26 * fs}px`, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                          {grupo.subcategoria}
                        </span>
                      </div>
                    </div>
                  )}
                  {grupo.items.map(p => {
                    const enCart = cart.find(i => i.producto.id === p.id)?.cantidad ?? 0;
                    return (
                      <ProductoRow key={p.id} p={p} enCart={enCart} tema={T} fs={fs}
                        onAdd={() => addToCart(p)} onRemove={() => removeOne(p.id)} />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── CARRITO: box flotante, ancla arriba del botón ── */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 69, background: "rgba(0,0,0,0.9)" }} />
          <div style={{
            position: "fixed", bottom: 100, left: 20, zIndex: 70,
            width: 340, maxWidth: "calc(100vw - 40px)",
            maxHeight: "calc(100vh - 180px)",
            boxShadow: "0 20px 50px -12px rgba(0,0,0,0.5)",
            borderRadius: 16,
          }}>
            <CartPanel
              cart={cart} tema={T} fs={fs}
              onClose={() => setCartOpen(false)}
              onAdd={addToCart}
              onRemoveOne={removeOne}
              onRemoveAll={removeAll}
            />
          </div>
        </>
      )}

      {/* ── BOTÓN FLOTANTE DEL CARRITO ── */}
      <button onClick={() => setCartOpen(o => !o)}
        className={cartBump ? "cart-bump" : ""}
        title="Tu Pedido"
        style={{
          position: "fixed", bottom: 24, left: 24, zIndex: 71,
          height: 60, borderRadius: 999,
          padding: "0 24px",
          background: T.amr, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}>
        <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 15, fontWeight: 900, color: "#1a1200", whiteSpace: "nowrap" }}>
          Tu Pedido
        </span>
        {totalItems > 0 && (
          <span style={{
            background: T.rojo, color: "#fff", borderRadius: "50%",
            minWidth: 22, height: 22, padding: "0 5px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-raleway),sans-serif", fontSize: 12, fontWeight: 900,
          }}>
            {totalItems}
          </span>
        )}
      </button>

      {/* ── MODAL PEDIDO ── */}
      {pedidoModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} onClick={() => setPedido(false)} />
          <div style={{ position: "relative", background: T.surface, borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 26, fontWeight: 900, color: T.text1, marginBottom: 6 }}>
              Confirmar pedido
            </div>
            <div style={{ fontSize: 16, color: T.text3, marginBottom: 24 }}>
              Tu mesero recibirá el pedido y vendrá a confirmarlo a la mesa antes de enviarlo a cocina.
            </div>

            {/* Resumen */}
            <div style={{ background: T.surf2, borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: `1px solid ${T.border}` }}>
              {cart.map(i => (
                <div key={i.producto.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: T.text2, padding: "4px 0" }}>
                  <span>{i.cantidad}× {i.producto.nombre}</span>
                  <span>{fmtPrecio(i.producto.precio * i.cantidad)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, color: T.text1 }}>
                <span>Total</span>
                <span style={{ color: T.amr }}>{fmtPrecio(totalPrecio)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 14, color: T.text3, display: "block", marginBottom: 5 }}>Mesa Nº *</label>
                <input value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: 5"
                  style={{ width: "100%", background: T.surf2, border: `1.5px solid ${mesa ? T.amr : T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 18, fontFamily: "var(--font-dm),sans-serif", color: T.text1, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 14, color: T.text3, display: "block", marginBottom: 5 }}>Tu nombre (opcional)</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Carlos"
                  style={{ width: "100%", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "var(--font-dm),sans-serif", color: T.text1, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 14, color: T.text3, display: "block", marginBottom: 5 }}>Notas / alergias (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Sin cebolla, sin gluten..."
                  rows={2}
                  style={{ width: "100%", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "var(--font-dm),sans-serif", color: T.text1, outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {errorPedido && (
              <div style={{ marginTop: 14, background: "#231515", border: "1px solid #6b2020", color: "#fca5a5", fontSize: 15, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                {errorPedido}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setPedido(false)}
                style={{ flex: 1, padding: "12px 0", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 17, fontFamily: "var(--font-dm),sans-serif", color: T.text2, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={hacerPedido} disabled={!mesa.trim() || enviando}
                style={{ flex: 2, padding: "12px 0", background: mesa.trim() ? T.amr : T.surf2, border: "none", borderRadius: 12, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-dm),sans-serif", color: mesa.trim() ? "#1a1200" : T.text3, cursor: mesa.trim() && !enviando ? "pointer" : "not-allowed", transition: "all 0.2s", opacity: enviando ? 0.7 : 1 }}>
                {enviando ? "Enviando..." : "🔔 Llamar al mesero"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRO ── */}
      {registroModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} onClick={() => setRegistroModal(false)} />
          <div style={{ position: "relative", background: T.surface, borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 26, fontWeight: 900, color: T.text1, marginBottom: 6 }}>
              ¿Quieres ser cliente?
            </div>
            <div style={{ fontSize: 16, color: T.text3, marginBottom: 24 }}>
              Inscríbete para recibir ofertas especiales, puntos de recompensa y acceso a contenido exclusivo.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 14, color: T.text3, display: "block", marginBottom: 5 }}>Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tuemail@ejemplo.com" type="email"
                  style={{ width: "100%", background: T.surf2, border: `1.5px solid ${email ? T.amr : T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "var(--font-dm),sans-serif", color: T.text1, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 14, color: T.text3, display: "block", marginBottom: 5 }}>Teléfono *</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678"
                  style={{ width: "100%", background: T.surf2, border: `1.5px solid ${telefono ? T.amr : T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: "var(--font-dm),sans-serif", color: T.text1, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {errorRegistro && (
              <div style={{ marginBottom: 14, background: "#231515", border: "1px solid #6b2020", color: "#fca5a5", fontSize: 15, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                {errorRegistro}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRegistroModal(false)}
                style={{ flex: 1, padding: "12px 0", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 17, fontFamily: "var(--font-dm),sans-serif", color: T.text2, cursor: "pointer" }}>
                Luego
              </button>
              <button onClick={hacerRegistro} disabled={!email.trim() || !telefono.trim() || registrando}
                style={{ flex: 2, padding: "12px 0", background: (email.trim() && telefono.trim()) ? T.amr : T.surf2, border: "none", borderRadius: 12, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-dm),sans-serif", color: (email.trim() && telefono.trim()) ? "#1a1200" : T.text3, cursor: (email.trim() && telefono.trim()) && !registrando ? "pointer" : "not-allowed", transition: "all 0.2s", opacity: registrando ? 0.7 : 1 }}>
                {registrando ? "Registrando..." : "✨ Ser Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST ── */}
      {success && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#1a2e1a", border: `1px solid #34d399`, borderRadius: 16,
          padding: "18px 28px", zIndex: 90, display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)", maxWidth: "90vw",
        }}>
          <span style={{ fontSize: 26 }}>✅</span>
          <div>
            <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 19, fontWeight: 800, color: "#34d399" }}>¡Bienvenido!</div>
            <div style={{ fontSize: 15, color: "#a7f3d0", marginTop: 2 }}>Tu pedido y registro fueron confirmados. Tu mesero viene a tu mesa.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProductoRow (vista lista) ──────────────────────────────────────
function ProductoRow({ p, enCart, tema: T, fs, onAdd, onRemove }: {
  p: Producto; enCart: number;
  tema: ReturnType<typeof buildT>;
  fs: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.surface, border: `1px solid ${hover || abierto ? T.amr : T.border}`,
        borderRadius: 14, overflow: "hidden", position: "relative",
        boxShadow: hover ? "0 6px 20px -8px rgba(0,0,0,0.25)" : "0 1px 4px -1px rgba(0,0,0,0.1)",
        transition: "all 0.2s",
      }}>

      {/* Encabezado — siempre visible, hace click para expandir */}
      <div
        onClick={() => setAbierto(o => !o)}
        style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${18 * fs}px`, fontWeight: 800, color: T.text1, lineHeight: 1.2 }}>
            {p.nombre}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${18 * fs}px`, fontWeight: 900, color: T.amr, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {fmtPrecio(p.precio)}
            </div>
            <span style={{
              display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center",
              color: T.text3, transform: abierto ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s",
            }}>▾</span>
          </div>
        </div>

        {(p.popular || p.badge) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.popular && (
              <span style={{ background: T.amr, color: "#1a1200", fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>★ Popular</span>
            )}
            {p.badge && (
              <span style={{ background: "rgba(255,255,255,0.08)", color: T.text3, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${T.border}` }}>{p.badge}</span>
            )}
          </div>
        )}
      </div>

      {/* Detalle — descripción y botón, solo si está expandido */}
      <div style={{ maxHeight: abierto ? 200 : 0, overflow: "hidden", transition: "max-height 0.25s ease" }}>
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {p.descripcion && (
            <div style={{ fontSize: `${14 * fs}px`, color: T.text3, lineHeight: 1.5 }}>
              {p.descripcion}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {enCart === 0 ? (
              <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{
                padding: "8px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10,
                fontFamily: "var(--font-dm),sans-serif", fontSize: `${13 * fs}px`, fontWeight: 700, color: T.text2,
                cursor: "pointer", whiteSpace: "nowrap",
              }}>+ Agregar</button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ width: 32, height: 32, background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 18, color: T.text1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${15 * fs}px`, fontWeight: 900, color: T.amr, minWidth: 18, textAlign: "center" }}>{enCart}</span>
                <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{ width: 32, height: 32, background: T.amr, border: "none", borderRadius: 8, fontSize: 18, color: "#1a1200", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>+</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ProductoCard ───────────────────────────────────────────────────
function ProductoCard({ p, enCart, tema: T, fs, onAdd, onRemove }: {
  p: Producto; enCart: number;
  tema: ReturnType<typeof buildT>;
  fs: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.surface, border: `1px solid ${hover ? T.amr : T.border}`,
        borderRadius: 18, overflow: "hidden",
        transition: "all 0.2s", transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 8px 32px rgba(0,0,0,0.2)" : "none",
      }}>

      {/* Foto */}
      <div style={{ position: "relative", height: 200, overflow: "hidden", background: T.surf2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolverImagen(p.foto, 500, 400)}
          alt={p.nombre}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", transform: hover ? "scale(1.05)" : "scale(1)" }}
        />
        {/* Badges */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          {p.popular && (
            <span style={{ background: T.amr, color: "#1a1200", fontSize: 13, fontWeight: 800, padding: "3px 10px", borderRadius: 999, letterSpacing: "0.05em" }}>
              ★ Popular
            </span>
          )}
          {p.badge && (
            <span style={{ background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 999, letterSpacing: "0.05em", backdropFilter: "blur(4px)" }}>
              {p.badge}
            </span>
          )}
        </div>
        {/* Overlay si en carrito */}
        {enCart > 0 && (
          <div style={{ position: "absolute", top: 10, right: 10, background: T.amr, color: "#1a1200", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-raleway),sans-serif", fontWeight: 900, fontSize: 16 }}>
            {enCart}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${17 * fs}px`, fontWeight: 800, color: T.text1, lineHeight: 1.25, flex: 1 }}>
            {p.nombre}
          </div>
          <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${17 * fs}px`, fontWeight: 900, color: T.amr, flexShrink: 0, letterSpacing: "-0.02em" }}>
            {fmtPrecio(p.precio)}
          </div>
        </div>

        <p style={{ fontSize: `${13 * fs}px`, color: T.text3, lineHeight: 1.65, margin: "0 0 16px", minHeight: `${13 * fs * 1.65 * 2}px` }}>
          {p.descripcion}
        </p>

        {/* Botones */}
        {enCart === 0 ? (
          <button onClick={onAdd} style={{
            width: "100%", padding: "11px 0", background: T.amr, border: "none", borderRadius: 12,
            fontFamily: "var(--font-dm),sans-serif", fontSize: `${14 * fs}px`, fontWeight: 700, color: "#1a1200",
            cursor: "pointer", transition: "opacity 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            + Agregar al pedido
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onRemove} style={{ width: 38, height: 38, background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 20, color: T.text1, cursor: "pointer", fontFamily: "var(--font-dm),sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
              −
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${17 * fs}px`, fontWeight: 900, color: T.amr }}>{enCart}</div>
              <div style={{ fontSize: 13, color: T.text3 }}>{fmtPrecio(p.precio * enCart)}</div>
            </div>
            <button onClick={onAdd} style={{ width: 38, height: 38, background: T.amr, border: "none", borderRadius: 10, fontSize: 20, color: "#1a1200", cursor: "pointer", fontFamily: "var(--font-dm),sans-serif", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CartPanel ──────────────────────────────────────────────────────
type TColor = { bg:string; surface:string; surf2:string; border:string; text1:string; text2:string; text3:string; amr:string; rojo:string; verde:string };
function buildT(_: never): TColor { return {} as TColor; }

function CartPanel({ cart, tema: T, fs, onClose, onAdd, onRemoveOne, onRemoveAll }: {
  cart: CartItem[];
  tema: TColor;
  fs: number;
  onClose: () => void;
  onAdd: (p: Producto) => void;
  onRemoveOne: (id: string) => void;
  onRemoveAll: (id: string) => void;
}) {
  const total = cart.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);
  return (
    <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", maxHeight: "calc(100vh - 110px)", display: "flex", flexDirection: "column" }}>
      {/* Header carrito */}
      <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 20, fontWeight: 900, color: T.text1 }}>
          Tu Pedido
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.text3 }}>✕</button>
      </div>

      {cart.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: `${14 * fs}px`, color: T.text3, lineHeight: 1.6 }}>
            Tu pedido está vacío.<br />Agrega algo de la carta.
          </div>
        </div>
      ) : (
        <>
          {/* Items */}
          <div style={{ padding: "8px 0", flex: 1, minHeight: 0, overflowY: "auto" }}>
            {cart.map(item => (
              <div key={item.producto.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${T.border}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolverImagen(item.producto.foto, 80, 80)}
                  alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: `${13 * fs}px`, fontWeight: 700, color: T.text1, lineHeight: 1.3 }}>{item.producto.nombre}</div>
                  <div style={{ fontSize: 15, color: T.amr, fontWeight: 700, marginTop: 2 }}>{fmtPrecio(item.producto.precio * item.cantidad)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onRemoveOne(item.producto.id)}
                    style={{ width: 26, height: 26, background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 16, color: T.text1, cursor: "pointer" }}>−</button>
                  <span style={{ fontSize: 17, fontWeight: 700, color: T.text1, minWidth: 16, textAlign: "center" }}>{item.cantidad}</span>
                  <button onClick={() => onAdd(item.producto)}
                    style={{ width: 26, height: 26, background: T.amr, border: "none", borderRadius: 7, fontSize: 16, fontWeight: 700, color: "#1a1200", cursor: "pointer" }}>+</button>
                  <button onClick={() => onRemoveAll(item.producto.id)}
                    style={{ width: 26, height: 26, background: "none", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 14, color: T.text3, cursor: "pointer", marginLeft: 4 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          {/* Total + CTA */}
          <div style={{ padding: "16px 20px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: `${13 * fs}px`, color: T.text3 }}>Subtotal ({cart.reduce((s,i)=>s+i.cantidad,0)} ítems)</span>
              <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${20 * fs}px`, fontWeight: 900, color: T.amr, letterSpacing: "-0.02em" }}>
                {fmtPrecio(total)}
              </span>
            </div>
            <div style={{ fontSize: 14, color: T.text3, marginBottom: 16 }}>
              El cobro se realiza al finalizar en la mesa.
            </div>
            <div style={{ width: "100%", padding: "14px 0", textAlign: "center", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 14, fontFamily: "var(--font-dm),sans-serif", fontSize: `${15 * fs}px`, fontWeight: 800, color: T.text2, boxSizing: "border-box" }}>
              🔔 Hacer Pedido — Llamar al Mesero
            </div>
          </div>
        </>
      )}
    </div>
  );
}
