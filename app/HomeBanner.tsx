"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [pausado, setPausado] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || pausado) return;
    const id = setInterval(() => setI(prev => (prev + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length, pausado]);

  // Al navegar manualmente, pausa el avance automático 10s y luego lo reanuda.
  function pausarTemporalmente() {
    setPausado(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPausado(false), 10000);
  }

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  function anterior() {
    setI(prev => (prev - 1 + slides.length) % slides.length);
    pausarTemporalmente();
  }
  function siguiente() {
    setI(prev => (prev + 1) % slides.length);
    pausarTemporalmente();
  }
  function irA(idx: number) {
    setI(idx);
    pausarTemporalmente();
  }

  if (slides.length === 0) return null;
  const slide = slides[i];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <style>{`
        .banner-arrow:hover { background: rgba(0,0,0,0.55) !important; transform: translateY(-50%) scale(1.06); }
        @media (max-width: 760px) {
          .banner-text-block { padding-bottom: clamp(72px, 14vh, 110px) !important; }
          .banner-arrow { width: 38px !important; height: 38px !important; }
        }
      `}</style>
      {slides.map((s, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.id} src={resolverImagen(s.foto, 1400, 900)} alt={s.nombre}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.65) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "68%", background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.26) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      <div className="banner-text-block" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(32px, 6vw, 60px) clamp(20px, 5vw, 60px)", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
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
        <>
          <button onClick={anterior} aria-label="Anterior" className="banner-arrow banner-arrow-left" style={{
            position: "absolute", left: "clamp(12px, 3vw, 28px)", top: "50%", transform: "translateY(-50%)",
            width: 46, height: 46, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.35)", color: TEXT1, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(4px)", transition: "background 0.2s ease, transform 0.2s ease", zIndex: 2,
          }}>
            <ChevronLeft size={24} />
          </button>
          <button onClick={siguiente} aria-label="Siguiente" className="banner-arrow banner-arrow-right" style={{
            position: "absolute", right: "clamp(12px, 3vw, 28px)", top: "50%", transform: "translateY(-50%)",
            width: 46, height: 46, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.35)", color: TEXT1, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(4px)", transition: "background 0.2s ease, transform 0.2s ease", zIndex: 2,
          }}>
            <ChevronRight size={24} />
          </button>

          <div style={{ position: "absolute", right: "clamp(20px, 5vw, 40px)", bottom: "clamp(30px, 6vw, 60px)", display: "flex", gap: 8 }}>
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => irA(idx)} aria-label={`Slide ${idx + 1}`}
                style={{ width: idx === i ? 28 : 10, height: 10, borderRadius: 99, background: idx === i ? AMR : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
