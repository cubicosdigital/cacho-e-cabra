"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import SelectorFoto from "../SelectorFoto";
import { resolverImagen } from "../../../../lib/imagenes";
import { TextoRico } from "../../../../lib/texto-rico";
import { coincideBusqueda } from "../../../../lib/busqueda";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../lib/tokens";

interface Producto {
  id: string; nombre: string; descripcion: string; precio: number; categoria: string; subcategoria: string | null;
  foto: string; badge: string | null; popular: boolean; disponible: boolean; orden: number;
}
type Borrador = Omit<Producto, "id" | "orden" | "popular" | "disponible"> & { popular?: boolean };

/** Mismas pestañas que la carta pública. "Cafetería" junta brunch y postres, como allá. */
const PESTAÑAS: { id: string; label: string; incluye: string[] }[] = [
  { id: "comida", label: "Comida", incluye: ["comida"] },
  { id: "tragos", label: "Tragos", incluye: ["tragos"] },
  { id: "cafeteria", label: "Cafetería", incluye: ["cafeteria", "brunch", "postres"] },
  { id: "chef", label: "Sugerencias del chef", incluye: ["chef"] },
];
const CATEGORIAS = ["comida", "tragos", "cafeteria", "brunch", "postres", "chef"];

const plata = (n: number) => `$${n.toLocaleString("es-CL")}`;
const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", boxSizing: "border-box" };
const vacio = (categoria: string): Borrador => ({ nombre: "", descripcion: "", precio: 0, categoria, subcategoria: "", foto: "", badge: "" });

/** Textarea con botón de negrita: selecciona palabras y pulsa B (o Ctrl+B). Guarda **así**. */
function EditorDescripcion({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function negrita() {
    const t = ref.current; if (!t) return;
    const { selectionStart: a, selectionEnd: b } = t;
    const antes = valor.slice(0, a), sel = valor.slice(a, b), despues = valor.slice(b);
    let nuevo: string, cursorA: number, cursorB: number;
    if (antes.endsWith("**") && despues.startsWith("**")) {                 // ya está en negrita: se quita
      nuevo = antes.slice(0, -2) + sel + despues.slice(2); cursorA = a - 2; cursorB = b - 2;
    } else if (sel.startsWith("**") && sel.endsWith("**") && sel.length > 4) {
      nuevo = antes + sel.slice(2, -2) + despues; cursorA = a; cursorB = b - 4;
    } else if (sel) {
      nuevo = `${antes}**${sel}**${despues}`; cursorA = a + 2; cursorB = b + 2;
    } else {
      nuevo = `${antes}****${despues}`; cursorA = cursorB = a + 2;
    }
    onChange(nuevo);
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(cursorA, cursorB); });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <button type="button" onClick={negrita} title="Negrita (Ctrl+B)" style={{ background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1, borderRadius: 6, width: 34, height: 30, fontWeight: 900, cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>B</button>
        <span style={{ fontSize: 14, color: TEXT3 }}>Selecciona palabras y pulsa <strong>B</strong> (o Ctrl+B) para dejarlas en negrita.</span>
      </div>
      <textarea ref={ref} value={valor} rows={5} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); negrita(); } }}
        placeholder="Describe el plato: ingredientes, tamaño, cómo se sirve…"
        style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
      {valor.trim() && (
        <div style={{ marginTop: 8, background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Así se verá en la carta</div>
          <div style={{ fontSize: 16, color: TEXT2, lineHeight: 1.5, whiteSpace: "pre-line" }}><TextoRico texto={valor} /></div>
        </div>
      )}
    </div>
  );
}

function FormularioProducto({ borrador, setBorrador, subcategorias, onGuardar, onCancelar, onEliminar, guardando, titulo }: {
  borrador: Borrador; setBorrador: (b: Borrador) => void; subcategorias: string[];
  onGuardar: () => void; onCancelar: () => void; onEliminar?: () => void; guardando: boolean; titulo: string;
}) {
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setBorrador({ ...borrador, [k]: v });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px 20px", background: SURF2 }}>
      <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900 }}>{titulo}</div>
      <SelectorFoto valor={borrador.foto ?? ""} onChange={foto => set("foto", foto)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>NOMBRE</div><input value={borrador.nombre} onChange={e => set("nombre", e.target.value)} style={inp} /></label>
        <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>PRECIO</div><input type="number" value={borrador.precio || ""} onChange={e => set("precio", parseInt(e.target.value, 10) || 0)} style={inp} /></label>
        <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>CATEGORÍA</div>
          <select value={borrador.categoria} onChange={e => set("categoria", e.target.value)} style={inp}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>SUBCATEGORÍA (agrupa en la carta)</div>
          <input list="subcats" value={borrador.subcategoria ?? ""} onChange={e => set("subcategoria", e.target.value)} style={inp} placeholder="Ej. Pizzas, Papas…" />
          <datalist id="subcats">{subcategorias.map(s => <option key={s} value={s} />)}</datalist></label>
        <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>ETIQUETA (opcional)</div><input value={borrador.badge ?? ""} onChange={e => set("badge", e.target.value)} style={inp} placeholder="Ej. Vegano, Nuevo" /></label>
      </div>
      <div><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, marginBottom: 4 }}>DESCRIPCIÓN</div>
        <EditorDescripcion valor={borrador.descripcion} onChange={v => set("descripcion", v)} /></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onGuardar} disabled={guardando || !borrador.nombre.trim() || !borrador.precio} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: FONT, opacity: guardando || !borrador.nombre.trim() || !borrador.precio ? 0.6 : 1 }}>{guardando ? "Guardando…" : "Guardar"}</button>
        <button onClick={onCancelar} style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>Cancelar</button>
        <div style={{ flex: 1 }} />
        {onEliminar && <button onClick={onEliminar} style={{ background: "none", border: "none", color: ROJO, cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>Eliminar producto</button>}
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pestaña, setPestaña] = useState("comida");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(vacio("comida"));
  const [nuevo, setNuevo] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    const res = await fetch("/api/productos");
    const d = await res.json();
    setProductos(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { (async () => { await cargar(); })(); }, []);

  const q = busqueda.trim().toLowerCase();
  const visibles = useMemo(() => {
    const cats = PESTAÑAS.find(p => p.id === pestaña)!.incluye;
    return productos.filter(p => (q ? true : cats.includes(p.categoria)) && (!q || coincideBusqueda(`${p.nombre} ${p.descripcion}`, q)));
  }, [productos, pestaña, q]);

  const grupos = useMemo(() => {
    const out: { sub: string | null; items: Producto[] }[] = [];
    for (const p of visibles) {
      const k = p.subcategoria || null, u = out[out.length - 1];
      if (u && u.sub === k) u.items.push(p); else out.push({ sub: k, items: [p] });
    }
    return out;
  }, [visibles]);

  const subcategorias = useMemo(() => [...new Set(productos.map(p => p.subcategoria).filter(Boolean))] as string[], [productos]);
  const conteo = (ids: string[]) => productos.filter(p => ids.includes(p.categoria)).length;

  function abrir(p: Producto) {
    if (abierto === p.id) { setAbierto(null); return; }
    setNuevo(null); setError("");
    setAbierto(p.id);
    setBorrador({ nombre: p.nombre, descripcion: p.descripcion ?? "", precio: p.precio, categoria: p.categoria, subcategoria: p.subcategoria ?? "", foto: p.foto ?? "", badge: p.badge ?? "" });
  }

  async function llamar(url: string, metodo: string, cuerpo?: unknown) {
    setError("");
    const res = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "No se pudo completar la acción"); return null; }
    return d;
  }

  async function guardar(id: string) {
    setGuardando(true);
    const d = await llamar(`/api/productos/${id}`, "PATCH", { ...borrador, subcategoria: borrador.subcategoria?.trim() || null, badge: borrador.badge?.trim() || null });
    setGuardando(false);
    if (d) { setProductos(prev => prev.map(x => x.id === id ? d : x)); setAbierto(null); }
  }

  async function crear() {
    if (!nuevo) return;
    setGuardando(true);
    const d = await llamar("/api/productos", "POST", { ...nuevo, subcategoria: nuevo.subcategoria?.trim() || null, badge: nuevo.badge?.trim() || null, disponible: true, orden: productos.length });
    setGuardando(false);
    if (d) { setProductos(prev => [...prev, d]); setNuevo(null); }
  }

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}" de la carta?`)) return;
    const d = await llamar(`/api/productos/${p.id}`, "DELETE");
    if (d) { setProductos(prev => prev.filter(x => x.id !== p.id)); setAbierto(null); }
  }

  async function alternar(p: Producto, campo: "disponible" | "popular") {
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, [campo]: !x[campo] } : x));
    const d = await llamar(`/api/productos/${p.id}`, "PATCH", { [campo]: !p[campo] });
    if (!d) await cargar();
  }

  const agotados = productos.filter(p => !p.disponible).length;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Menú carta</div>
            <div style={{ fontSize: 17, color: TEXT3 }}>
              {productos.length} productos · {productos.length - agotados} disponibles{agotados > 0 && <> · <span style={{ color: ROJO }}>{agotados} agotados</span></>}
            </div>
          </div>
          <button onClick={() => { setAbierto(null); setError(""); setNuevo(vacio(PESTAÑAS.find(p => p.id === pestaña)!.incluye[0])); }}
            style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>+ Agregar producto</button>
        </div>

        <div style={{ fontSize: 15, color: TEXT3, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
          Se ve como la carta del sitio. Toca un producto para editar su foto, precio y descripción. El botón <strong style={{ color: VERDE }}>Disponible</strong> / <strong style={{ color: ROJO }}>Agotado</strong> es el stock: un producto agotado se oculta de la carta pública hasta que lo vuelvas a marcar.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, flexWrap: "wrap" }}>
            {PESTAÑAS.map(t => (
              <button key={t.id} onClick={() => { setPestaña(t.id); setAbierto(null); setBusqueda(""); }} style={{
                fontFamily: FONT, fontSize: 16, fontWeight: 700, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: pestaña === t.id && !q ? AMR : "transparent", color: pestaña === t.id && !q ? "#1a1200" : TEXT2,
              }}>{t.label} <span style={{ opacity: 0.65, fontWeight: 500 }}>{conteo(t.incluye)}</span></button>
            ))}
          </div>
          <input placeholder="Buscar en toda la carta…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inp, width: 260 }} />
        </div>

        {error && <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{error}</div>}

        {nuevo && (
          <div style={{ border: `1px solid ${AMR}`, borderRadius: 16, overflow: "hidden" }}>
            <FormularioProducto titulo="Nuevo producto" borrador={nuevo} setBorrador={setNuevo} subcategorias={subcategorias} guardando={guardando} onGuardar={crear} onCancelar={() => setNuevo(null)} />
          </div>
        )}

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : visibles.length === 0 ? (
          <div style={{ color: TEXT3, padding: 24, textAlign: "center" }}>No hay productos en esta sección.</div>
        ) : grupos.map((g, gi) => (
          <div key={gi}>
            {g.sub && <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: AMR, margin: "8px 0 10px" }}>{g.sub}</div>}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              {g.items.map((p, idx) => {
                const abiertoAqui = abierto === p.id;
                return (
                  <div key={p.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
                    <div onClick={() => abrir(p)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", cursor: "pointer", opacity: p.disponible ? 1 : 0.55, background: abiertoAqui ? SURF2 : "transparent" }}>
                      <div style={{ width: 96, height: 68, flexShrink: 0, borderRadius: 10, overflow: "hidden", background: SURF2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.foto
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={resolverImagen(p.foto, 300, 210)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ color: TEXT3, fontSize: 12 }}>sin foto</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 19 }}>{p.nombre}</span>
                          {p.badge && <span style={{ fontSize: 12, fontWeight: 700, color: TEXT3, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "1px 8px" }}>{p.badge}</span>}
                          {p.popular && <span style={{ fontSize: 12, fontWeight: 800, background: AMR, color: "#1a1200", borderRadius: 999, padding: "1px 8px" }}>★ Popular</span>}
                        </div>
                        <div style={{ fontSize: 15, color: TEXT3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.descripcion ? <TextoRico texto={p.descripcion.replace(/\n/g, " ")} /> : <em>Sin descripción · toca para agregar</em>}
                        </div>
                      </div>
                      <div style={{ fontFamily: TITLE, fontWeight: 900, fontSize: 19, color: AMR, flexShrink: 0 }}>{plata(p.precio)}</div>
                      <button onClick={e => { e.stopPropagation(); alternar(p, "popular"); }} title="Mostrar en los destacados del home"
                        style={{ flexShrink: 0, fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "6px 10px", border: "none", cursor: "pointer", fontFamily: FONT, background: p.popular ? "#3a2f10" : SURF2, color: p.popular ? AMR : TEXT3 }}>{p.popular ? "★" : "☆"}</button>
                      <button onClick={e => { e.stopPropagation(); alternar(p, "disponible"); }}
                        style={{ flexShrink: 0, fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT, background: p.disponible ? "#1a2e1a" : "#2a1212", color: p.disponible ? VERDE : "#fca5a5" }}>{p.disponible ? "Disponible" : "Agotado"}</button>
                      <span style={{ color: TEXT3, transform: abiertoAqui ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
                    </div>
                    {abiertoAqui && (
                      <FormularioProducto titulo={`Editar: ${p.nombre}`} borrador={borrador} setBorrador={setBorrador} subcategorias={subcategorias} guardando={guardando}
                        onGuardar={() => guardar(p.id)} onCancelar={() => setAbierto(null)} onEliminar={() => eliminar(p)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
