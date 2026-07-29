"use client";
import { useEffect, useState } from "react";
import { AMR, TEXT1, TITLE } from "../lib/tokens";
import { resolverImagen } from "../lib/imagenes";

export interface Slide {
  id: string
  nombre: string
  descripcion: string
  foto: string
  precio: number
  tipo?: 'producto' | 'evento'
  botonTexto?: string
  botonHref?: string
  /** Texto chico sobre el título. Si no viene, se deduce del tipo. */
  etiqueta?: string
  /** Oculta el precio, por ejemplo en banners de contenido. */
  ocultarPrecio?: boolean
}

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

export default function HomeBanner({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setI(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[i];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", marginTop: "-110px" }}>
      {slides.map((s, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.id} src={resolverImagen(s.foto, 1400, 900)} alt={s.nombre}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.65) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "68%", background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.26) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(32px, 6vw, 60px) clamp(20px, 5vw, 60px)", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "clamp(10px, 1.1vw, 13px)", color: AMR, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          {slide.etiqueta || (slide.tipo === 'evento' ? '🎉 Evento Exclusivo' : 'Sugerencia del chef')}
        </div>
        <div style={{ fontFamily: TITLE, fontSize: "clamp(1.5rem, 3.6vw, 2.4rem)", fontWeight: 900, color: TEXT1, marginBottom: 8, lineHeight: 1.15 }}>{slide.nombre}</div>
        <div style={{ fontSize: "clamp(13px, 1.4vw, 15px)", color: "#e8e0d8", maxWidth: 480, lineHeight: 1.55, marginBottom: 18 }}>{slide.descripcion}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {slide.tipo !== 'evento' && !slide.ocultarPrecio && (
            <span style={{ fontFamily: TITLE, fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 900, color: AMR }}>{fmt(slide.precio)}</span>
          )}
          <a href={slide.botonHref || "/carta"} style={{ background: AMR, color: "#1a1200", borderRadius: 999, padding: "10px 24px", fontSize: "clamp(13px, 1.3vw, 15px)", fontWeight: 800, textDecoration: "none", cursor: "pointer", transition: "transform 0.2s", display: "inline-block" }}>
            {slide.botonTexto || 'Pedir ahora'}
          </a>
        </div>
      </div>
      {slides.length > 1 && (
        <div style={{ position: "absolute", right: "clamp(20px, 5vw, 40px)", bottom: "clamp(30px, 6vw, 60px)", display: "flex", gap: 8 }}>
          {slides.map((s, idx) => (
            <button key={s.id} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
              style={{ width: idx === i ? 28 : 10, height: 10, borderRadius: 99, background: idx === i ? AMR : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.3s ease" }} />
          ))}
        </div>
      )}
    </div>
  );
}
