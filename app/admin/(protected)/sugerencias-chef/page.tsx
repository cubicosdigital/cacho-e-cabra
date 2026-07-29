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

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

export default function SugerenciasChefPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Producto>>({});
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "", descripcion: "" });
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/productos");
    const data = await res.json();
    setProductos(Array.isArray(data) ? data.filter((p: Producto) => p.categoria === "chef") : []);
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

  async function togglePublicado(p: Producto) {
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, disponible: !x.disponible } : x));
    await fetch(`/api/productos/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponible: !p.disponible }),
    });
  }

  function startEdit(p: Producto) {
    setEditId(p.id);
    setEditDraft({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, foto: p.foto });
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
        categoria: "chef",
        foto: "",
        disponible: false,
        orden: productos.length,
      }),
    });
    setCreando(false);
    if (res.ok) {
      const created = await res.json();
      setProductos(prev => [...prev, created]);
      setNuevo({ nombre: "", precio: "", descripcion: "" });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>👨‍🍳 Sugerencias del Chef</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {productos.length} sugerencias · {productos.filter(p => p.disponible).length} publicadas · se muestran en la carta solo viernes, sábado y domingo
          </div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {productos.map((p, idx) => {
              const isEd = editId === p.id;
              return (
                <div key={p.id} style={{ padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`, opacity: p.disponible ? 1 : 0.6 }}>
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
                          {!p.disponible && <span style={{ fontSize: 16, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>borrador</span>}
                        </div>
                        <div style={{ fontSize: 17, color: TEXT2, marginTop: 2 }}>{p.descripcion}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 19, color: AMR, flexShrink: 0 }}>{fmt(p.precio)}</div>
                      <button onClick={() => togglePublicado(p)} style={{
                        flexShrink: 0, fontSize: 16, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                        background: p.disponible ? "#1a2e1a" : SURF2, color: p.disponible ? VERDE : TEXT3,
                      }}>{p.disponible ? "✓ Publicada" : "Publicar"}</button>
                      <button onClick={() => startEdit(p)} style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>Editar</button>
                      <button onClick={() => eliminar(p.id)} style={{ flexShrink: 0, background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontFamily: FONT, fontSize: 20 }}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
            {productos.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Sin sugerencias del chef todavía</div>}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>+ Nueva sugerencia del chef</div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>Se crea como borrador. Usa &quot;Publicar&quot; cuando esté disponible.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
              style={{ flex: 2, minWidth: 180, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <input placeholder="Descripción" value={nuevo.descripcion} onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))}
              style={{ flex: 3, minWidth: 200, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <input type="number" placeholder="Precio" value={nuevo.precio} onChange={e => setNuevo(n => ({ ...n, precio: e.target.value }))}
              style={{ width: 110, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <button onClick={crear} disabled={creando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {creando ? "..." : "Crear borrador"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
