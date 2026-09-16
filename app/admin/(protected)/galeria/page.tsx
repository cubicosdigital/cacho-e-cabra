"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Film, Image as ImageIcon, List, LayoutGrid, GripVertical } from "lucide-react";
import type { GaleriaItem, TipoGaleria } from "../../../../lib/galeria";
import type { GaleriaCategoria } from "../../../../lib/galeriaCategorias";
import { resolverImagen } from "../../../../lib/imagenes";
import { youtubeThumbnail, extraerYoutubeId } from "../../../../lib/youtube";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16,
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  appearance: "auto",
};

export default function GaleriaAdminPage() {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [categorias, setCategorias] = useState<GaleriaCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TipoGaleria>("imagen");
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ titulo: "", categoria: "", url: "" });
  const inputsArchivo = useRef<Record<string, HTMLInputElement | null>>({});
  const inputArchivoNuevo = useRef<HTMLInputElement | null>(null);
  const [subiendoNuevo, setSubiendoNuevo] = useState(false);
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
  const [vista, setVista] = useState<"lista" | "cuadricula">("cuadricula");
  const [arrastrando, setArrastrando] = useState<string | null>(null);

  async function cargar() {
    const [resItems, resCats] = await Promise.all([
      fetch("/api/galeria?todos=1"),
      fetch("/api/galeria-categorias?todos=1"),
    ]);
    if (resItems.ok) setItems(await resItems.json());
    if (resCats.ok) {
      const cats: GaleriaCategoria[] = await resCats.json();
      setCategorias(cats);
      setNuevo(n => ({ ...n, categoria: n.categoria || cats.find(c => c.activo)?.nombre || "" }));
    }
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function patch(id: string, body: Partial<GaleriaItem>) {
    setError(null);
    const previo = items;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...body } : i));
    const res = await fetch(`/api/galeria/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setItems(previo); setError("No se pudo guardar el cambio"); }
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
    await patch(id, { url });
  }

  async function crear() {
    if (!nuevo.titulo.trim() || !nuevo.categoria.trim()) return;
    if (tab === "video" && !extraerYoutubeId(nuevo.url)) {
      setError("Pega un link válido de YouTube");
      return;
    }
    setError(null);
    const delMismoTipo = items.filter(i => i.tipo === tab);
    const res = await fetch("/api/galeria", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: tab,
        titulo: nuevo.titulo.trim(),
        categoria: nuevo.categoria.trim(),
        url: nuevo.url.trim(),
        descripcion: "",
        activo: tab === "video", // una foto recién subida se activa después de subir el archivo
        orden: delMismoTipo.length,
      }),
    });
    if (res.ok) {
      const creado: GaleriaItem = await res.json();
      setItems(prev => [...prev, creado]);
      setNuevo({ titulo: "", categoria: "", url: "" });
    } else {
      setError("No se pudo crear el ítem");
    }
  }

  async function subirFotosNuevas(archivos: FileList) {
    if (!nuevo.titulo.trim() || !nuevo.categoria.trim()) {
      setError("Ponle título y categoría antes de subir la foto");
      return;
    }
    const lista = Array.from(archivos);
    const esGaleria = lista.length > 1;
    setSubiendoNuevo(true);
    setProgreso({ actual: 0, total: lista.length });
    setError(null);

    const creados: GaleriaItem[] = [];
    let orden = items.filter(i => i.tipo === "imagen").length;

    for (let i = 0; i < lista.length; i++) {
      const fd = new FormData();
      fd.append("archivo", lista[i]);
      const resUp = await fetch("/api/upload", { method: "POST", body: fd });
      if (!resUp.ok) {
        const d = await resUp.json().catch(() => ({}));
        setError(d.error || `No se pudo subir la foto ${i + 1} de ${lista.length}`);
        continue;
      }
      const { url } = await resUp.json();
      // Con varias fotos a la vez arman una galería: mismo título/categoría, numeradas.
      const titulo = esGaleria ? `${nuevo.titulo.trim()} ${i + 1}` : nuevo.titulo.trim();
      const res = await fetch("/api/galeria", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "imagen", titulo, categoria: nuevo.categoria.trim(),
          url, descripcion: "", activo: true, orden: orden++,
        }),
      });
      if (res.ok) creados.push(await res.json());
      else setError(`No se pudo crear el ítem de la foto ${i + 1}`);

      setProgreso({ actual: i + 1, total: lista.length });
    }

    setSubiendoNuevo(false);
    setProgreso(null);
    if (creados.length) {
      setItems(prev => [...prev, ...creados]);
      setNuevo({ titulo: "", categoria: "", url: "" });
    }
  }

  async function eliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar "${titulo}" de la galería?`)) return;
    const res = await fetch(`/api/galeria/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    else setError("No se pudo eliminar");
  }

  async function mover(id: string, delta: number) {
    const grupo = items.filter(i => i.tipo === tab);
    const i = grupo.findIndex(x => x.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= grupo.length) return;
    const copia = [...grupo];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    const reordenado = copia.map((x, k) => ({ ...x, orden: k }));
    setItems(prev => prev.map(x => reordenado.find(r => r.id === x.id) ?? x));
    await Promise.all(reordenado.map(x =>
      fetch(`/api/galeria/${x.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: x.orden }),
      })
    ));
  }

  async function reordenarPorDrag(idArrastrado: string, idDestino: string) {
    if (idArrastrado === idDestino) return;
    const grupo = items.filter(i => i.tipo === tab);
    const i = grupo.findIndex(x => x.id === idArrastrado);
    const j = grupo.findIndex(x => x.id === idDestino);
    if (i === -1 || j === -1) return;

    const copia = [...grupo];
    const [movido] = copia.splice(i, 1);
    copia.splice(j, 0, movido);
    const reordenado = copia.map((x, k) => ({ ...x, orden: k }));

    setItems(prev => prev.map(x => reordenado.find(r => r.id === x.id) ?? x));
    const cambiados = reordenado.filter((x, k) => grupo.find(g => g.id === x.id)?.orden !== k);
    await Promise.all(cambiados.map(x =>
      fetch(`/api/galeria/${x.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: x.orden }),
      })
    ));
  }

  const delTab = useMemo(() => items.filter(i => i.tipo === tab), [items, tab]);
  const activos = delTab.filter(i => i.activo).length;
  const opcionesCategoria = categorias.filter(c => c.activo).map(c => c.nombre);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Galería</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            Videos de YouTube y fotografías, agrupados por categoría (Aniversario, Carta, etc.) para la página pública /galeria.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(["imagen", "video"] as TipoGaleria[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 20px", borderRadius: 999, border: `1px solid ${BORDER}`, cursor: "pointer",
              fontFamily: FONT, fontSize: 16, fontWeight: 700,
              background: tab === t ? AMR : SURFACE, color: tab === t ? "#1a1200" : TEXT2,
            }}>
              {t === "video"
                ? <Film size={18} strokeWidth={2} fill={tab === t ? "#1a1200" : TEXT2} color={tab === t ? "#1a1200" : TEXT2} />
                : <ImageIcon size={18} strokeWidth={2} fill={tab === t ? "#1a1200" : TEXT2} color={tab === t ? "#1a1200" : TEXT2} />}
              {t === "video" ? "Videos" : "Fotos"}
            </button>
          ))}
          <div style={{ display: "flex", alignItems: "center", color: TEXT3, fontSize: 15, marginLeft: 8 }}>
            {activos} de {delTab.length} activos
          </div>

          <div style={{ display: "flex", gap: 4, marginLeft: "auto", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
            <button onClick={() => setVista("lista")} title="Vista lista" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 14, fontWeight: 700,
              background: vista === "lista" ? AMR : "transparent", color: vista === "lista" ? "#1a1200" : TEXT2,
            }}>
              <List size={16} />
            </button>
            <button onClick={() => setVista("cuadricula")} title="Vista cuadrícula" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 14, fontWeight: 700,
              background: vista === "cuadricula" ? AMR : "transparent", color: vista === "cuadricula" ? "#1a1200" : TEXT2,
            }}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {delTab.length > 1 && (
          <div style={{ fontSize: 14, color: TEXT3, marginTop: -12 }}>
            Arrastra {vista === "cuadricula" ? "una foto" : "un ítem"} para reordenar.
          </div>
        )}

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : delTab.length === 0 ? (
          <div style={{ color: TEXT3, fontSize: 16, padding: "20px 0" }}>
            Todavía no hay {tab === "video" ? "videos" : "fotos"}. Agrega el primero abajo.
          </div>
        ) : vista === "cuadricula" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {delTab.map(it => (
              <div
                key={it.id}
                draggable
                onDragStart={() => setArrastrando(it.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (arrastrando) reordenarPorDrag(arrastrando, it.id); setArrastrando(null); }}
                onDragEnd={() => setArrastrando(null)}
                style={{
                  background: SURFACE, border: `1px solid ${arrastrando === it.id ? AMR : BORDER}`, borderRadius: 12,
                  overflow: "hidden", opacity: it.activo ? 1 : 0.5, cursor: "grab",
                }}
              >
                <div style={{ width: "100%", height: 120, background: SURF2, position: "relative" }}>
                  {it.tipo === "video" ? (
                    it.url && extraerYoutubeId(it.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={youtubeThumbnail(it.url)} alt={it.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                    ) : <div style={{ color: TEXT3, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>Sin link</div>
                  ) : it.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolverImagen(it.url, 300, 220)} alt={it.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                  ) : <div style={{ color: TEXT3, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>Sin imagen</div>}
                  <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 5px", display: "flex" }}>
                    <GripVertical size={14} color="#fff" />
                  </div>
                </div>
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.titulo}>
                    {it.titulo || "Sin título"}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => patch(it.id, { activo: !it.activo })} style={{
                      flex: 1, fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "5px 0", border: "none", cursor: "pointer", fontFamily: FONT,
                      background: it.activo ? "#1a2e1a" : SURF2, color: it.activo ? VERDE : TEXT3,
                    }}>{it.activo ? "Activo" : "Oculto"}</button>
                    <button onClick={() => eliminar(it.id, it.titulo)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#fca5a5", cursor: "pointer", fontSize: 14, padding: "0 8px" }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {delTab.map((it, i) => (
              <div
                key={it.id}
                draggable
                onDragStart={() => setArrastrando(it.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (arrastrando) reordenarPorDrag(arrastrando, it.id); setArrastrando(null); }}
                onDragEnd={() => setArrastrando(null)}
                style={{
                  background: SURFACE, border: `1px solid ${arrastrando === it.id ? AMR : BORDER}`, borderRadius: 16,
                  padding: 16, display: "flex", gap: 16, flexWrap: "wrap", opacity: it.activo ? 1 : 0.6, cursor: "grab",
                }}>
                <div style={{ width: 220, flexShrink: 0 }}>
                  <div style={{ width: "100%", height: 130, borderRadius: 10, overflow: "hidden", background: SURF2, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {it.tipo === "video" ? (
                      it.url && extraerYoutubeId(it.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={youtubeThumbnail(it.url)} alt={it.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : <span style={{ color: TEXT3, fontSize: 15 }}>Sin link</span>
                    ) : it.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolverImagen(it.url, 440, 260)} alt={it.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <span style={{ color: TEXT3, fontSize: 15 }}>Sin imagen</span>}
                  </div>

                  {it.tipo === "imagen" ? (
                    <>
                      <input
                        ref={el => { inputsArchivo.current[it.id] = el; }}
                        type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(it.id, f); e.target.value = ""; }}
                      />
                      <button onClick={() => inputsArchivo.current[it.id]?.click()} disabled={subiendo === it.id} style={{
                        width: "100%", marginTop: 8, background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1,
                        borderRadius: 8, padding: "8px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                      }}>
                        {subiendo === it.id ? "Subiendo…" : "Subir nueva foto"}
                      </button>
                    </>
                  ) : (
                    <input value={it.url} placeholder="Link de YouTube"
                      onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, url: e.target.value } : x))}
                      onBlur={e => patch(it.id, { url: e.target.value })}
                      style={{ ...inputBase, width: "100%", marginTop: 6, fontSize: 14 }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={it.titulo} placeholder="Título"
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, titulo: e.target.value } : x))}
                    onBlur={e => patch(it.id, { titulo: e.target.value })} style={{ ...inputBase, fontWeight: 700 }} />
                  <select value={it.categoria}
                    onChange={e => { setItems(prev => prev.map(x => x.id === it.id ? { ...x, categoria: e.target.value } : x)); patch(it.id, { categoria: e.target.value }); }}
                    style={selectBase}>
                    {!opcionesCategoria.includes(it.categoria) && <option value={it.categoria}>{it.categoria} (sin categoría activa)</option>}
                    {opcionesCategoria.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea value={it.descripcion} placeholder="Descripción (opcional)"
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, descripcion: e.target.value } : x))}
                    onBlur={e => patch(it.id, { descripcion: e.target.value })} style={{ ...inputBase, minHeight: 50 }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => patch(it.id, { activo: !it.activo })} style={{
                    fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "8px 14px", border: "none", cursor: "pointer", fontFamily: FONT,
                    background: it.activo ? "#1a2e1a" : SURF2, color: it.activo ? VERDE : TEXT3,
                  }}>{it.activo ? "Activo" : "Oculto"}</button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => mover(it.id, -1)} disabled={i === 0} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 0", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                    <button onClick={() => mover(it.id, 1)} disabled={i === delTab.length - 1} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 0", cursor: i === delTab.length - 1 ? "default" : "pointer", opacity: i === delTab.length - 1 ? 0.4 : 1 }}>↓</button>
                  </div>
                  <button onClick={() => eliminar(it.id, it.titulo)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>
              + Agregar {tab === "video" ? "video" : "foto"}
            </div>
            <a href="/admin/galeria/categorias" style={{ color: AMR, fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              Administrar categorías →
            </a>
          </div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>
            {tab === "video"
              ? "Pega el link de YouTube y elige la categoría."
              : "Ponle título y categoría, y sube el archivo. Si eliges varias fotos a la vez, se agrupan como una galería dentro de esa categoría."}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Título" value={nuevo.titulo ?? ""} onChange={e => setNuevo(n => ({ ...n, titulo: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            {opcionesCategoria.length > 0 ? (
              <select value={nuevo.categoria ?? ""} onChange={e => setNuevo(n => ({ ...n, categoria: e.target.value }))} style={{ ...selectBase, flex: 1, minWidth: 160 }}>
                {opcionesCategoria.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <div style={{ ...inputBase, flex: 1, minWidth: 160, color: TEXT3 }}>
                <a href="/admin/galeria/categorias" style={{ color: AMR }}>Crea una categoría primero →</a>
              </div>
            )}
            {tab === "video" ? (
              <Fragment key="form-video">
                <input placeholder="Link de YouTube" value={nuevo.url ?? ""} onChange={e => setNuevo(n => ({ ...n, url: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 220 }} />
                <button onClick={crear} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Agregar</button>
              </Fragment>
            ) : (
              <Fragment key="form-imagen">
                <input
                  ref={inputArchivoNuevo}
                  type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple style={{ display: "none" }}
                  onChange={e => { const fs = e.target.files; if (fs && fs.length) subirFotosNuevas(fs); e.target.value = ""; }}
                />
                <button onClick={() => inputArchivoNuevo.current?.click()} disabled={subiendoNuevo} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  {progreso ? `Subiendo ${progreso.actual} de ${progreso.total}…` : "Subir foto(s)"}
                </button>
              </Fragment>
            )}
          </div>

          {progreso && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: TEXT3, marginBottom: 6 }}>
                <span>Subiendo foto {progreso.actual} de {progreso.total}</span>
                <span>{Math.round((progreso.actual / progreso.total) * 100)}%</span>
              </div>
              <div style={{ width: "100%", height: 8, borderRadius: 999, background: SURF2, overflow: "hidden" }}>
                <div style={{
                  width: `${(progreso.actual / progreso.total) * 100}%`, height: "100%", background: AMR,
                  borderRadius: 999, transition: "width 0.25s ease",
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
