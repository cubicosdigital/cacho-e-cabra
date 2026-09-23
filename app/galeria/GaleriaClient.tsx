"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Play, Film, Image as ImageIcon, Heart, Share2 } from "lucide-react";
import type { GaleriaItem, TipoGaleria } from "../../lib/galeria";
import { resolverImagen } from "../../lib/imagenes";
import { youtubeThumbnail, youtubeEmbedUrl, extraerYoutubeId } from "../../lib/youtube";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, ROJO, FONT, TITLE } from "../../lib/tokens";

const LIKES_KEY = "cacho-cabra-galeria-likes";

function leerLikesGuardados(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

const BLOQUE = 24;

// Muestra un fondo mientras carga y hace fundido al llegar; si falla, reintenta una vez antes de dejar el fondo.
function Foto({ src }: { src: string }) {
  const [listo, setListo] = useState(false);
  const [intento, setIntento] = useState(0);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={intento ? `${src}${src.includes("?") ? "&" : "?"}r=${intento}` : src}
      alt="" loading="lazy" decoding="async"
      onLoad={() => setListo(true)}
      onError={() => { if (intento < 2) setTimeout(() => setIntento(n => n + 1), 800 * (intento + 1)); }}
      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: listo ? 1 : 0, transition: "opacity .35s ease, transform .3s ease" }}
    />
  );
}

export default function GaleriaClient({ items: itemsIniciales, categoriasAdmin }: { items: GaleriaItem[]; categoriasAdmin: string[] }) {
  const [items, setItems] = useState(itemsIniciales);
  const [tab, setTab] = useState<TipoGaleria>("imagen");
  const [catSel, setCatSel] = useState<string>("todas");
  const [abierto, setAbierto] = useState<GaleriaItem | null>(null);
  const [yaLiked, setYaLiked] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(BLOQUE);
  const centinela = useRef<HTMLDivElement>(null);

  useEffect(() => { setYaLiked(leerLikesGuardados()); }, []);

  const delTab = useMemo(() => items.filter(i => i.tipo === tab), [items, tab]);
  // El submenú muestra las categorías creadas en el admin (aunque aún no tengan fotos)
  // más cualquier categoría "suelta" que ya tenga contenido pero no esté en esa lista.
  const categorias = useMemo(() => {
    const orden = [...categoriasAdmin];
    for (const it of delTab) if (!orden.includes(it.categoria)) orden.push(it.categoria);
    return orden;
  }, [delTab, categoriasAdmin]);
  const categoriasConContenido = useMemo(() => categorias.filter(c => delTab.some(i => i.categoria === c)), [categorias, delTab]);
  const categoriasAMostrar = catSel === "todas" ? categoriasConContenido : categorias.filter(c => c === catSel);

  // Si al cambiar de pestaña (fotos/videos) la categoría elegida no existe ahí, mostramos todas.
  useEffect(() => {
    if (catSel !== "todas" && !categorias.includes(catSel)) setCatSel("todas");
  }, [categorias, catSel]);

  let restante = limite;
  const bloques = categoriasAMostrar.map(cat => {
    const todos = delTab.filter(i => i.categoria === cat);
    const visibles = todos.slice(0, Math.max(restante, 0));
    restante -= visibles.length;
    return { cat, todos, visibles };
  });
  const hayMas = bloques.reduce((n, b) => n + b.todos.length, 0) > limite;

  // Al acercarse al final de lo mostrado, se agrega el siguiente bloque de fotos.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver(es => { if (es[0].isIntersecting) setLimite(l => l + BLOQUE); }, { rootMargin: "600px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, limite]);

  const hayVideos = items.some(i => i.tipo === "video");
  const hayFotos = items.some(i => i.tipo === "imagen");

  async function darLike(it: GaleriaItem) {
    if (yaLiked.has(it.id)) return;
    setYaLiked(prev => new Set(prev).add(it.id));
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, likes: x.likes + 1 } : x));
    if (abierto?.id === it.id) setAbierto(prev => prev ? { ...prev, likes: prev.likes + 1 } : prev);

    try {
      const guardados = leerLikesGuardados();
      guardados.add(it.id);
      localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(guardados)));
    } catch { /* si falla el storage, el like igual se cuenta en el servidor */ }

    const res = await fetch(`/api/galeria/${it.id}/like`, { method: "POST" });
    if (res.ok) {
      const { likes } = await res.json();
      setItems(prev => prev.map(x => x.id === it.id ? { ...x, likes } : x));
      if (abierto?.id === it.id) setAbierto(prev => prev ? { ...prev, likes } : prev);
    }
  }

  async function compartir(it: GaleriaItem) {
    const url = it.tipo === "video"
      ? `https://www.youtube.com/watch?v=${extraerYoutubeId(it.url)}`
      : `${window.location.origin}${resolverImagen(it.url, 1400, 1400)}`;
    const texto = it.titulo || "Mira esto en Cacho Cabra";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Cacho Cabra", text: texto, url });
      } catch { /* el usuario canceló el share, no hacemos nada */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, "_blank");
    }
  }

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh" }}>
      <style>{`
        .gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); grid-auto-rows: 150px; grid-auto-flow: dense; gap: 10px; }
        @media (max-width: 600px) { .gal-grid { grid-auto-rows: 110px; gap: 8px; } }
        .gal-card { position: relative; overflow: hidden; border-radius: 12px; cursor: pointer; background: ${SURFACE}; border: 1px solid ${BORDER}; }
        .gal-card.big { grid-column: span 2; grid-row: span 2; }
        .gal-card img { transition: transform 0.3s ease; }
        .gal-card:hover img { transform: scale(1.04); }
        .gal-btn {
          display: flex; align-items: center; gap: 4px; border: none; cursor: pointer;
          background: rgba(0,0,0,0.55); color: #fff; border-radius: 999px; padding: 5px 9px;
          font-family: ${FONT}; font-size: 12px; font-weight: 700; backdrop-filter: blur(2px);
        }
      `}</style>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "60px 20px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: TITLE, fontSize: 44, fontWeight: 900, marginBottom: 10, color: TEXT1 }}>
            📸 Galería
          </h1>
          <p style={{ fontSize: 17, color: TEXT3, lineHeight: 1.6, maxWidth: 620 }}>
            Fotos y videos de Cacho Cabra: aniversario, la carta y los mejores momentos del local.
          </p>
        </div>

        {hayVideos && hayFotos && (
          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {(["imagen", "video"] as TipoGaleria[]).map(t => {
              const Icon = t === "video" ? Film : ImageIcon;
              const color = tab === t ? "#1a1200" : TEXT1;
              return (
                <button key={t} onClick={() => { setTab(t); setLimite(BLOQUE); }} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 22px", borderRadius: 999, border: `1px solid ${BORDER}`, cursor: "pointer",
                  fontFamily: FONT, fontSize: 16, fontWeight: 700,
                  background: tab === t ? AMR : SURFACE, color,
                }}>
                  <Icon size={18} strokeWidth={2} fill={color} color={color} />
                  {t === "video" ? "Videos" : "Fotos"}
                </button>
              );
            })}
          </div>
        )}

        {categorias.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <button onClick={() => { setCatSel("todas"); setLimite(BLOQUE); }} style={{
              padding: "7px 18px", borderRadius: 999, border: `1px solid ${BORDER}`, cursor: "pointer",
              fontFamily: FONT, fontSize: 14, fontWeight: 700,
              background: catSel === "todas" ? TEXT1 : "transparent", color: catSel === "todas" ? BG : TEXT3,
            }}>
              Todas
            </button>
            {categorias.map(cat => (
              <button key={cat} onClick={() => { setCatSel(cat); setLimite(BLOQUE); }} style={{
                padding: "7px 18px", borderRadius: 999, border: `1px solid ${BORDER}`, cursor: "pointer",
                fontFamily: FONT, fontSize: 14, fontWeight: 700,
                background: catSel === cat ? TEXT1 : "transparent", color: catSel === cat ? BG : TEXT3,
              }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {catSel === "todas" && delTab.length === 0 && (
          <div style={{ color: TEXT3, fontSize: 17, padding: "40px 0" }}>Muy pronto vamos a subir contenido acá.</div>
        )}

        {bloques.map(({ cat, todos: itemsCat, visibles }) => {
          if (visibles.length === 0 && itemsCat.length > 0) return null;
          return (
          <div key={cat} style={{ marginBottom: 44 }}>
            {catSel === "todas" && <h2 style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, marginBottom: 16, color: TEXT1 }}>{cat}</h2>}
            {itemsCat.length === 0 ? (
              <div style={{ color: TEXT3, fontSize: 16, padding: "20px 0" }}>
                Todavía no hay {tab === "video" ? "videos" : "fotos"} en "{cat}".
              </div>
            ) : (
            <div className="gal-grid">
              {visibles.map((it, idx) => (
                <div key={it.id} className={`gal-card${idx % 7 === 0 ? " big" : ""}`} onClick={() => setAbierto(it)}>
                  <Foto src={it.tipo === "video" ? youtubeThumbnail(it.url) : resolverImagen(it.url, 500, 500)} />
                  {it.tipo === "video" && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.25)", pointerEvents: "none",
                    }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Play size={22} color="#fff" fill="#fff" />
                      </div>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <button className="gal-btn" onClick={e => { e.stopPropagation(); darLike(it); }}>
                      <Heart size={13} fill={yaLiked.has(it.id) ? ROJO : "none"} color={yaLiked.has(it.id) ? ROJO : "#fff"} />
                      {it.likes > 0 && it.likes}
                    </button>
                    <button className="gal-btn" onClick={e => { e.stopPropagation(); compartir(it); }}>
                      <Share2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
          );
        })}
        {hayMas && <div ref={centinela} style={{ height: 60, textAlign: "center", color: TEXT3, fontSize: 15 }}>Cargando más fotos…</div>}
      </main>

      {abierto && (
        <div
          onClick={() => setAbierto(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <button onClick={() => setAbierto(null)} aria-label="Cerrar" style={{
            position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none",
            borderRadius: "50%", width: 44, height: 44, color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={22} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 960, width: "100%" }}>
            {abierto.tipo === "video" ? (
              <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                <iframe
                  src={youtubeEmbedUrl(abierto.url) + "?autoplay=1"}
                  title={abierto.titulo}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolverImagen(abierto.url, 1400, 1400)} alt="" style={{ width: "100%", maxHeight: "76vh", objectFit: "contain", borderRadius: 12 }} />
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <button onClick={() => darLike(abierto)} style={{
                display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BORDER}`, cursor: "pointer",
                background: SURFACE, color: "#fff", borderRadius: 999, padding: "9px 18px", fontFamily: FONT, fontSize: 15, fontWeight: 700,
              }}>
                <Heart size={18} fill={yaLiked.has(abierto.id) ? ROJO : "none"} color={yaLiked.has(abierto.id) ? ROJO : "#fff"} />
                {abierto.likes > 0 ? abierto.likes : "Me gusta"}
              </button>
              <button onClick={() => compartir(abierto)} style={{
                display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BORDER}`, cursor: "pointer",
                background: SURFACE, color: "#fff", borderRadius: 999, padding: "9px 18px", fontFamily: FONT, fontSize: 15, fontWeight: 700,
              }}>
                <Share2 size={18} /> Compartir
              </button>
            </div>

            {abierto.tipo === "video" && abierto.titulo && (
              <div style={{ color: TEXT1, fontSize: 17, fontWeight: 700, marginTop: 14, textAlign: "center" }}>{abierto.titulo}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
