"use client";
import { useMemo, useState } from "react";
import { X, Play, Film, Image as ImageIcon } from "lucide-react";
import type { GaleriaItem, TipoGaleria } from "../../lib/galeria";
import { resolverImagen } from "../../lib/imagenes";
import { youtubeThumbnail, youtubeEmbedUrl } from "../../lib/youtube";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../lib/tokens";

export default function GaleriaClient({ items }: { items: GaleriaItem[] }) {
  const [tab, setTab] = useState<TipoGaleria>("video");
  const [abierto, setAbierto] = useState<GaleriaItem | null>(null);

  const delTab = useMemo(() => items.filter(i => i.tipo === tab), [items, tab]);
  const categorias = useMemo(() => {
    const orden: string[] = [];
    for (const it of delTab) if (!orden.includes(it.categoria)) orden.push(it.categoria);
    return orden;
  }, [delTab]);

  const hayVideos = items.some(i => i.tipo === "video");
  const hayFotos = items.some(i => i.tipo === "imagen");

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh" }}>
      <style>{`
        .gal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        @media (max-width: 1080px) { .gal-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .gal-grid { grid-template-columns: repeat(2, 1fr); } }
        .gal-card { transition: transform 0.2s ease, border-color 0.2s ease; cursor: pointer; }
        .gal-card:hover { transform: translateY(-2px); border-color: ${AMR}; }
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
            {(["video", "imagen"] as TipoGaleria[]).map(t => {
              const Icon = t === "video" ? Film : ImageIcon;
              const color = tab === t ? "#1a1200" : TEXT1;
              return (
                <button key={t} onClick={() => setTab(t)} style={{
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

        {delTab.length === 0 && (
          <div style={{ color: TEXT3, fontSize: 17, padding: "40px 0" }}>Muy pronto vamos a subir contenido acá.</div>
        )}

        {categorias.map(cat => (
          <div key={cat} style={{ marginBottom: 44 }}>
            <h2 style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, marginBottom: 16, color: TEXT1 }}>{cat}</h2>
            <div className="gal-grid">
              {delTab.filter(i => i.categoria === cat).map(it => (
                <div key={it.id} className="gal-card" onClick={() => setAbierto(it)} style={{
                  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden",
                }}>
                  <div style={{ position: "relative", height: 160 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.tipo === "video" ? youtubeThumbnail(it.url) : resolverImagen(it.url, 400, 260)}
                      alt={it.titulo}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {it.tipo === "video" && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.25)",
                      }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Play size={22} color="#fff" fill="#fff" />
                        </div>
                      </div>
                    )}
                  </div>
                  {it.titulo && (
                    <div style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700, color: TEXT1 }}>{it.titulo}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
              <img src={resolverImagen(abierto.url, 1400, 1400)} alt={abierto.titulo} style={{ width: "100%", maxHeight: "82vh", objectFit: "contain", borderRadius: 12 }} />
            )}
            {abierto.titulo && (
              <div style={{ color: TEXT1, fontSize: 17, fontWeight: 700, marginTop: 14, textAlign: "center" }}>{abierto.titulo}</div>
            )}
            {abierto.descripcion && (
              <div style={{ color: TEXT3, fontSize: 15, marginTop: 4, textAlign: "center" }}>{abierto.descripcion}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
