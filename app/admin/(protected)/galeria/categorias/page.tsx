"use client";
import { useEffect, useState } from "react";
import type { GaleriaCategoria } from "../../../../../lib/galeriaCategorias";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../../lib/tokens";

export default function GaleriaCategoriasPage() {
  const [categorias, setCategorias] = useState<GaleriaCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");

  async function cargar() {
    const res = await fetch("/api/galeria-categorias?todos=1");
    if (res.ok) setCategorias(await res.json());
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!nueva.trim()) return;
    setError(null);
    const res = await fetch("/api/galeria-categorias", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nueva.trim() }),
    });
    if (res.ok) {
      const creada: GaleriaCategoria = await res.json();
      setCategorias(prev => [...prev, creada]);
      setNueva("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo crear la categoría");
    }
  }

  async function patch(id: string, body: Partial<GaleriaCategoria>) {
    setError(null);
    const previo = categorias;
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...body } : c));
    const res = await fetch(`/api/galeria-categorias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setCategorias(previo);
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar el cambio");
    }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la categoría "${nombre}"? Las fotos que la usan no se borran, solo quedan sin categoría asignada en el select.`)) return;
    const res = await fetch(`/api/galeria-categorias/${id}`, { method: "DELETE" });
    if (res.ok) setCategorias(prev => prev.filter(c => c.id !== id));
    else setError("No se pudo eliminar");
  }

  async function mover(id: string, delta: number) {
    const i = categorias.findIndex(c => c.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= categorias.length) return;
    const copia = [...categorias];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    const reordenado = copia.map((c, k) => ({ ...c, orden: k }));
    setCategorias(reordenado);
    await Promise.all(reordenado.map(c =>
      fetch(`/api/galeria-categorias/${c.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: c.orden }),
      })
    ));
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <a href="/admin/galeria" style={{ color: TEXT3, fontSize: 15, textDecoration: "none" }}>← Volver a Galería</a>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, marginTop: 6 }}>Categorías de la galería</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            Estas son las categorías que vas a poder elegir al subir fotos o videos en /admin/galeria.
          </div>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Nueva categoría (ej: Fiestas, Local)"
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") crear(); }}
            style={{
              flex: 1, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: "10px 14px", color: TEXT1, fontFamily: FONT, fontSize: 16,
            }}
          />
          <button onClick={crear} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Agregar
          </button>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categorias.length === 0 && (
              <div style={{ color: TEXT3, fontSize: 16 }}>Todavía no hay categorías. Crea la primera arriba.</div>
            )}
            {categorias.map((c, i) => (
              <div key={c.id} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: c.activo ? 1 : 0.55,
              }}>
                <input
                  value={c.nombre}
                  onChange={e => setCategorias(prev => prev.map(x => x.id === c.id ? { ...x, nombre: e.target.value } : x))}
                  onBlur={e => patch(c.id, { nombre: e.target.value })}
                  style={{
                    flex: 1, background: "transparent", border: "none", color: TEXT1, fontFamily: FONT,
                    fontSize: 16, fontWeight: 700, outline: "none",
                  }}
                />
                <button onClick={() => patch(c.id, { activo: !c.activo })} style={{
                  fontSize: 13, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                  background: c.activo ? "#1a2e1a" : SURF2, color: c.activo ? VERDE : TEXT3,
                }}>{c.activo ? "Activa" : "Oculta"}</button>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => mover(c.id, -1)} disabled={i === 0} style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 6, padding: "4px 8px", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                  <button onClick={() => mover(c.id, 1)} disabled={i === categorias.length - 1} style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 6, padding: "4px 8px", cursor: i === categorias.length - 1 ? "default" : "pointer", opacity: i === categorias.length - 1 ? 0.4 : 1 }}>↓</button>
                </div>
                <button onClick={() => eliminar(c.id, c.nombre)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 18 }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
