"use client";
import { useEffect, useRef, useState } from "react";
import type { SlideBanner } from "../../../../lib/banner";
import { resolverImagen } from "../../../../lib/imagenes";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16,
};

export default function BannerPage() {
  const [slides, setSlides] = useState<SlideBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ titulo: "", etiqueta: "", descripcion: "" });
  const inputsArchivo = useRef<Record<string, HTMLInputElement | null>>({});

  async function cargar() {
    const res = await fetch("/api/banner");
    if (res.ok) setSlides(await res.json());
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function patch(id: string, body: Partial<SlideBanner>) {
    setError(null);
    const previo = slides;
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...body } : s));
    const res = await fetch(`/api/banner/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setSlides(previo); setError("No se pudo guardar el cambio"); }
  }

  async function subirFoto(id: string, archivo: File) {
    setError(null);
    setSubiendo(id);
    const fd = new FormData();
    fd.append("archivo", archivo);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setSubiendo(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo subir la imagen");
      return;
    }
    const { url } = await res.json();
    await patch(id, { imagen: url });
  }

  async function crear() {
    if (!nuevo.titulo.trim()) return;
    setError(null);
    const res = await fetch("/api/banner", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevo, activo: false }),
    });
    if (res.ok) {
      const creado: SlideBanner = await res.json();
      setSlides(prev => [...prev, creado]);
      setNuevo({ titulo: "", etiqueta: "", descripcion: "" });
    } else {
      setError("No se pudo crear el slide");
    }
  }

  async function eliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar el slide "${titulo}" del banner?`)) return;
    const res = await fetch(`/api/banner/${id}`, { method: "DELETE" });
    if (res.ok) setSlides(prev => prev.filter(s => s.id !== id));
    else setError("No se pudo eliminar");
  }

  async function mover(id: string, delta: number) {
    const i = slides.findIndex(s => s.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= slides.length) return;
    const copia = [...slides];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    const reordenado = copia.map((s, k) => ({ ...s, orden: k }));
    setSlides(reordenado);
    await Promise.all(reordenado.map(s =>
      fetch(`/api/banner/${s.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: s.orden }),
      })
    ));
  }

  const activos = slides.filter(s => s.activo).length;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Banner principal</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {activos > 0
              ? `${activos} ${activos === 1 ? "slide activo" : "slides activos"} en el home.`
              : "Sin slides activos: el home usa automáticamente los eventos destacados y las sugerencias del chef."}
          </div>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {slides.map((s, i) => (
              <div key={s.id} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
                padding: 16, display: "flex", gap: 16, flexWrap: "wrap", opacity: s.activo ? 1 : 0.6,
              }}>
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ width: "100%", height: 130, borderRadius: 10, overflow: "hidden", background: SURF2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {s.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolverImagen(s.imagen, 440, 260)} alt={s.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: TEXT3, fontSize: 15 }}>Sin imagen</span>
                    )}
                  </div>
                  <input
                    ref={el => { inputsArchivo.current[s.id] = el; }}
                    type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(s.id, f); e.target.value = ""; }}
                  />
                  <button onClick={() => inputsArchivo.current[s.id]?.click()} disabled={subiendo === s.id} style={{
                    width: "100%", marginTop: 8, background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1,
                    borderRadius: 8, padding: "8px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  }}>
                    {subiendo === s.id ? "Subiendo…" : "Subir nueva foto"}
                  </button>
                  <input value={s.imagen} onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, imagen: e.target.value } : x))}
                    onBlur={e => patch(s.id, { imagen: e.target.value })}
                    placeholder="…o pega un ID de Unsplash / URL"
                    style={{ ...inputBase, width: "100%", marginTop: 6, fontSize: 14 }} />
                </div>

                <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={s.etiqueta} placeholder="Etiqueta (ej: 🎉 Evento Exclusivo)"
                    onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, etiqueta: e.target.value } : x))}
                    onBlur={e => patch(s.id, { etiqueta: e.target.value })} style={inputBase} />
                  <input value={s.titulo} placeholder="Título"
                    onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, titulo: e.target.value } : x))}
                    onBlur={e => patch(s.id, { titulo: e.target.value })} style={{ ...inputBase, fontWeight: 700 }} />
                  <textarea value={s.descripcion} placeholder="Descripción"
                    onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, descripcion: e.target.value } : x))}
                    onBlur={e => patch(s.id, { descripcion: e.target.value })} style={{ ...inputBase, minHeight: 60 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={s.botonTexto} placeholder="Texto del botón"
                      onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, botonTexto: e.target.value } : x))}
                      onBlur={e => patch(s.id, { botonTexto: e.target.value })} style={{ ...inputBase, flex: 1, minWidth: 150 }} />
                    <input value={s.botonHref} placeholder="/eventos/4"
                      onChange={e => setSlides(prev => prev.map(x => x.id === s.id ? { ...x, botonHref: e.target.value } : x))}
                      onBlur={e => patch(s.id, { botonHref: e.target.value })} style={{ ...inputBase, flex: 1, minWidth: 150 }} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => patch(s.id, { activo: !s.activo })} style={{
                    fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "8px 14px", border: "none", cursor: "pointer", fontFamily: FONT,
                    background: s.activo ? "#1a2e1a" : SURF2, color: s.activo ? VERDE : TEXT3,
                  }}>{s.activo ? "Activo" : "Oculto"}</button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => mover(s.id, -1)} disabled={i === 0} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 0", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                    <button onClick={() => mover(s.id, 1)} disabled={i === slides.length - 1} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 0", cursor: i === slides.length - 1 ? "default" : "pointer", opacity: i === slides.length - 1 ? 0.4 : 1 }}>↓</button>
                  </div>
                  <button onClick={() => eliminar(s.id, s.titulo)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>+ Agregar slide</div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>Se crea oculto. Súbele la foto y actívalo cuando esté listo.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Título" value={nuevo.titulo} onChange={e => setNuevo(n => ({ ...n, titulo: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            <input placeholder="Etiqueta" value={nuevo.etiqueta} onChange={e => setNuevo(n => ({ ...n, etiqueta: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 160 }} />
            <input placeholder="Descripción" value={nuevo.descripcion} onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            <button onClick={crear} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Agregar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
