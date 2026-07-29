"use client";
import { useEffect, useState } from "react";
import SelectorFoto from "../SelectorFoto";
import { resolverImagen } from "../../../../lib/imagenes";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  foto: string;
  badge: string | null;
  popular: boolean;
  disponible: boolean;
  orden: number;
}

const CATEGORIAS = ["chef", "cafeteria", "brunch", "comida", "tragos", "postres"] as const;

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

export default function MenuPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Producto>>({});
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "", categoria: "comida" as string, descripcion: "" });
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/productos");
    const data = await res.json();
    setProductos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

  async function toggleDisponible(p: Producto) {
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, disponible: !x.disponible } : x));
    await fetch(`/api/productos/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponible: !p.disponible }),
    });
  }

  // "popular" es lo que el home usa para armar la sección de destacados.
  async function toggleDestacado(p: Producto) {
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, popular: !x.popular } : x));
    await fetch(`/api/productos/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ popular: !p.popular }),
    });
  }

  function startEdit(p: Producto) {
    setEditId(p.id);
    setEditDraft({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, badge: p.badge, popular: p.popular, foto: p.foto });
  }

  async function guardarEdit(id: string) {
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      const updated = await res.json();
      setProductos(prev => prev.map(x => x.id === id ? updated : x));
    }
    setEditId(null);
  }

  async function eliminar(id: string) {
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    if (res.ok) setProductos(prev => prev.filter(x => x.id !== id));
  }

  async function crear() {
    if (!nuevo.nombre.trim() || !nuevo.precio) return;
    setCreando(true);
    const res = await fetch("/api/productos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevo.nombre.trim(),
        descripcion: nuevo.descripcion.trim(),
        precio: parseInt(nuevo.precio, 10),
        categoria: nuevo.categoria,
        foto: "",
        disponible: true,
        orden: productos.length,
      }),
    });
    setCreando(false);
    if (res.ok) {
      const created = await res.json();
      setProductos(prev => [...prev, created]);
      setNuevo({ nombre: "", precio: "", categoria: nuevo.categoria, descripcion: "" });
    }
  }

  const filtered = productos.filter(p => {
    const catOk = filtroCat === "todos" || p.categoria === filtroCat;
    const searchOk = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Menú</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{productos.length} productos · {productos.filter(p => p.disponible).length} disponibles</div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 18, fontFamily: FONT, color: TEXT1, outline: "none", minWidth: 220 }} />
          <div style={{ display: "flex", gap: 6, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, flexWrap: "wrap" }}>
            {["todos", ...CATEGORIAS].map(c => (
              <button key={c} onClick={() => setFiltroCat(c)} style={{
                fontFamily: FONT, fontSize: 17, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: filtroCat === c ? AMR : "transparent", color: filtroCat === c ? "#1a1200" : TEXT3,
              }}>{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {filtered.map((p, idx) => {
              const isEd = editId === p.id;
              return (
                <div key={p.id} style={{ padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`, opacity: p.disponible ? 1 : 0.5 }}>
                  {isEd ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <SelectorFoto valor={editDraft.foto ?? ""} onChange={foto => setEditDraft(d => ({ ...d, foto }))} />
                      <input value={editDraft.nombre ?? ""} onChange={e => setEditDraft(d => ({ ...d, nombre: e.target.value }))}
                        style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT }} />
                      <textarea value={editDraft.descripcion ?? ""} onChange={e => setEditDraft(d => ({ ...d, descripcion: e.target.value }))}
                        style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, minHeight: 50 }} />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" value={editDraft.precio ?? 0} onChange={e => setEditDraft(d => ({ ...d, precio: parseInt(e.target.value) || 0 }))}
                          style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, width: 120 }} />
                        <button onClick={() => guardarEdit(p.id)} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Guardar</button>
                        <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 74, height: 52, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: SURF2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {p.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolverImagen(p.foto, 220, 150)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: TEXT3, fontSize: 12 }}>sin foto</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: 19 }}>{p.nombre}</span>
                          <span style={{ fontSize: 16, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{p.categoria}</span>
                          {!p.disponible && <span style={{ fontSize: 16, color: "#fca5a5", background: "#2a1212", borderRadius: 6, padding: "2px 8px" }}>agotado</span>}
                        </div>
                        <div style={{ fontSize: 17, color: TEXT2, marginTop: 2 }}>{p.descripcion}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 19, color: AMR, flexShrink: 0 }}>{fmt(p.precio)}</div>
                      <button onClick={() => toggleDestacado(p)} title="Mostrar en los destacados del home" style={{
                        flexShrink: 0, fontSize: 16, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                        background: p.popular ? "#3a2f10" : SURF2, color: p.popular ? AMR : TEXT3,
                      }}>{p.popular ? "★ En el home" : "☆ Home"}</button>
                      <button onClick={() => toggleDisponible(p)} style={{
                        flexShrink: 0, fontSize: 16, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                        background: p.disponible ? "#1a2e1a" : SURF2, color: p.disponible ? VERDE : TEXT3,
                      }}>{p.disponible ? "Disponible" : "Agotado"}</button>
                      <button onClick={() => startEdit(p)} style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>Editar</button>
                      <button onClick={() => eliminar(p.id)} style={{ flexShrink: 0, background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontFamily: FONT, fontSize: 20 }}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Sin productos</div>}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>+ Agregar producto</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
              style={{ flex: 2, minWidth: 180, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <input placeholder="Descripción" value={nuevo.descripcion} onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))}
              style={{ flex: 3, minWidth: 200, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <input type="number" placeholder="Precio" value={nuevo.precio} onChange={e => setNuevo(n => ({ ...n, precio: e.target.value }))}
              style={{ width: 110, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <select value={nuevo.categoria} onChange={e => setNuevo(n => ({ ...n, categoria: e.target.value }))}
              style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={crear} disabled={creando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {creando ? "..." : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
