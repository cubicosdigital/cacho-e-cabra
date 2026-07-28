"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";

// ─── tipos ─────────────────────────────────────────────────────────
type Categoria = "todo" | "chef" | "cafeteria" | "brunch" | "comida" | "tragos" | "postres";
type Tema      = "oscuro" | "claro";
type FontSize  = "normal" | "grande" | "extra";
type Vista     = "grid" | "lista" | "carta";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: Omit<Categoria, "todo">;
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
  { id:"todo",      label:"Todo",               emoji:"✦"  },
  { id:"chef",      label:"Sugerencias del Chef",emoji:"👨‍🍳" },
  { id:"cafeteria", label:"Cafetería",           emoji:"☕"  },
  { id:"brunch",    label:"Brunch",              emoji:"🍳"  },
  { id:"comida",    label:"Comida",              emoji:"🍽️" },
  { id:"tragos",    label:"Tragos",              emoji:"🍹"  },
  { id:"postres",   label:"Postres",             emoji:"🍰"  },
];

function fmtPrecio(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

// Las sugerencias del chef son un especial de fin de semana: solo se
// muestran viernes, sábado y domingo, y solo si el admin las publicó.
function esFinDeSemanaChef() {
  const dia = new Date().getDay(); // 0=domingo, 5=viernes, 6=sábado
  return dia === 0 || dia === 5 || dia === 6;
}

const FONT_SCALE: Record<FontSize, number> = { normal:1, grande:1.15, extra:1.3 };

// ─── page ──────────────────────────────────────────────────────────
export default function CartaPage() {
  const [cat,      setCat]      = useState<Categoria>("todo");
  const [busqueda, setBusqueda] = useState("");
  const [tema,     setTema]     = useState<Tema>("oscuro");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [vista,    setVista]    = useState<Vista>("grid");
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
      setSuccess(true);
      setCart([]);
      setMesa(""); setNombre(""); setNotas("");
      setTimeout(() => setSuccess(false), 6000);
    } catch {
      setErrorPedido("No se pudo enviar el pedido. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const chefProductos = productos.filter(p => p.categoria === "chef");
  const mostrarChef = esFinDeSemanaChef() && chefProductos.length > 0;
  const categoriasVisibles = CATEGORIAS.filter(c => c.id !== "chef" || mostrarChef);

  const porCategoria = cat === "todo" ? productos : productos.filter(p => p.categoria === cat);
  const q = busqueda.trim().toLowerCase();
  const filtered = q === ""
    ? porCategoria
    : porCategoria.filter(p => p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "var(--font-dm), sans-serif", color: T.text1, transition: "background 0.3s, color 0.3s" }}>

      {/* ── HEADER + TABS (sticky en un solo bloque, sin gap entre ambos) ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: T.bg }}>
        <header style={{ borderBottom: `1px solid ${T.border}`, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, backdropFilter: "blur(8px)" }}>

          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, textDecoration: "none" }}>
            <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={176} height={140} style={{ objectFit: "contain" }} />
            <span style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 26, fontWeight: 900, color: T.text1 }}>
              Carta
            </span>
          </a>

          {/* Controles */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>

            {/* Tema */}
            <button onClick={() => setTema(t => t === "oscuro" ? "claro" : "oscuro")}
              title={tema === "oscuro" ? "Cambiar a fondo claro" : "Cambiar a fondo oscuro"}
              style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontSize: 18, color: T.text2, display: "flex", alignItems: "center", gap: 6 }}>
              {tema === "oscuro" ? "☀️" : "🌙"}
            </button>

            {/* Vista (grid / lista) */}
            <div style={{ display: "flex", background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              {([
                { v: "grid"  as Vista, icon: "⊞", title: "Vista iconos" },
                { v: "lista" as Vista, icon: "☰", title: "Vista lista"  },
                { v: "carta" as Vista, icon: "📰", title: "Vista carta impresa" },
              ]).map(({ v, icon, title }) => (
                <button key={v} onClick={() => setVista(v)} title={title}
                  style={{
                    padding: "7px 14px", border: "none", cursor: "pointer",
                    background: vista === v ? T.amr : "transparent",
                    color: vista === v ? "#1a1200" : T.text3,
                    fontSize: 18, transition: "all 0.15s",
                  }}>
                  {icon}
                </button>
              ))}
            </div>

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

        {/* Category tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 20px 0" }}>
          <div style={{
            display: "flex", gap: 18, overflowX: "auto", overflowY: "hidden",
            paddingBottom: 12, borderBottom: `1px solid ${T.border}`,
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

          {/* Buscador */}
          <div style={{ position: "relative", marginBottom: 18 }}>
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

          {/* Contador */}
          <div style={{ fontSize: 14, color: T.text3, letterSpacing: "0.04em", marginBottom: 20 }}>
            {filtered.length} productos
          </div>

          {/* Productos */}
          {cargando ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: T.text3 }}>Cargando carta…</div>
          ) : vista === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {filtered.map(p => {
                const enCart = cart.find(i => i.producto.id === p.id)?.cantidad ?? 0;
                return (
                  <ProductoCard key={p.id} p={p} enCart={enCart} tema={T} fs={fs}
                    onAdd={() => addToCart(p)} onRemove={() => removeOne(p.id)} />
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(p => {
                const enCart = cart.find(i => i.producto.id === p.id)?.cantidad ?? 0;
                return (
                  <ProductoRow key={p.id} p={p} enCart={enCart} tema={T} fs={fs}
                    onAdd={() => addToCart(p)} onRemove={() => removeOne(p.id)} />
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── CARRITO: box flotante, ancla arriba del botón ── */}
      {cartOpen && (
        <div style={{
          position: "fixed", bottom: 100, right: 20, zIndex: 70,
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
            onPedido={() => { setCartOpen(false); setPedido(true); }}
          />
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DEL CARRITO ── */}
      <button onClick={() => setCartOpen(o => !o)}
        className={cartBump ? "cart-bump" : ""}
        title="Tu Pedido"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 71,
          height: 60, borderRadius: 999,
          padding: "0 22px 0 18px",
          background: T.amr, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}>
        <span style={{ position: "relative", display: "flex" }}>
          <ShoppingCart size={26} strokeWidth={2.4} fill="#1a1200" fillOpacity={0.18} color="#1a1200" />
          {totalItems > 0 && (
            <span style={{
              position: "absolute", top: -10, right: -10,
              background: T.rojo, color: "#fff", borderRadius: "50%",
              minWidth: 22, height: 22, padding: "0 5px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-raleway),sans-serif", fontSize: 12, fontWeight: 900,
              border: `2px solid ${T.amr}`,
            }}>
              {totalItems}
            </span>
          )}
        </span>
        <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 15, fontWeight: 900, color: "#1a1200", whiteSpace: "nowrap" }}>
          Tu Pedido
        </span>
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
            <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 19, fontWeight: 800, color: "#34d399" }}>¡Pedido enviado!</div>
            <div style={{ fontSize: 15, color: "#a7f3d0", marginTop: 2 }}>Tu mesero viene a confirmar el pedido a la mesa.</div>
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
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.surface, border: `1px solid ${hover ? T.amr : T.border}`,
        borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center",
        transition: "all 0.2s", gap: 0,
      }}>

      {/* Foto pequeña */}
      <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0, overflow: "hidden", background: T.surf2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://images.unsplash.com/${p.foto}?auto=format&fit=crop&w=180&h=180&q=80`}
          alt={p.nombre} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hover ? "scale(1.06)" : "scale(1)" }}
        />
        {enCart > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(251,191,36,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-raleway),sans-serif", fontWeight: 900, fontSize: 24, color: "#1a1200" }}>
            {enCart}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${15 * fs}px`, fontWeight: 800, color: T.text1, lineHeight: 1.2 }}>
              {p.nombre}
            </span>
            {p.popular && (
              <span style={{ background: T.amr, color: "#1a1200", fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>★ Popular</span>
            )}
            {p.badge && (
              <span style={{ background: "rgba(255,255,255,0.08)", color: T.text3, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${T.border}` }}>{p.badge}</span>
            )}
          </div>
          <div style={{
            fontSize: `${14 * fs}px`, color: T.text3, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never, overflow: "hidden",
          }}>
            {p.descripcion}
          </div>
        </div>

        {/* Precio + botones */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${18 * fs}px`, fontWeight: 900, color: T.amr, letterSpacing: "-0.02em" }}>
            {fmtPrecio(p.precio)}
          </div>
          {enCart === 0 ? (
            <button onClick={onAdd} style={{
              padding: "8px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10,
              fontFamily: "var(--font-dm),sans-serif", fontSize: `${13 * fs}px`, fontWeight: 700, color: T.text2,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>+ Agregar</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={onRemove} style={{ width: 32, height: 32, background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 18, color: T.text1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: `${15 * fs}px`, fontWeight: 900, color: T.amr, minWidth: 18, textAlign: "center" }}>{enCart}</span>
              <button onClick={onAdd} style={{ width: 32, height: 32, background: T.amr, border: "none", borderRadius: 8, fontSize: 18, color: "#1a1200", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>+</button>
            </div>
          )}
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
          src={`https://images.unsplash.com/${p.foto}?auto=format&fit=crop&w=500&h=400&q=85`}
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

function CartPanel({ cart, tema: T, fs, onClose, onAdd, onRemoveOne, onRemoveAll, onPedido }: {
  cart: CartItem[];
  tema: TColor;
  fs: number;
  onClose: () => void;
  onAdd: (p: Producto) => void;
  onRemoveOne: (id: string) => void;
  onRemoveAll: (id: string) => void;
  onPedido: () => void;
}) {
  const total = cart.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);
  return (
    <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", maxHeight: "calc(100vh - 110px)", display: "flex", flexDirection: "column" }}>
      {/* Header carrito */}
      <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-raleway),sans-serif", fontSize: 20, fontWeight: 900, color: T.text1 }}>
          🛒 Tu Pedido
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
                <img src={`https://images.unsplash.com/${item.producto.foto}?auto=format&fit=crop&w=80&h=80&q=70`}
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
            <button onClick={onPedido}
              style={{ width: "100%", padding: "14px 0", background: T.amr, border: "none", borderRadius: 14, fontFamily: "var(--font-dm),sans-serif", fontSize: `${15 * fs}px`, fontWeight: 800, color: "#1a1200", cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              🔔 Hacer Pedido — Llamar al Mesero
            </button>
          </div>
        </>
      )}
    </div>
  );
}
