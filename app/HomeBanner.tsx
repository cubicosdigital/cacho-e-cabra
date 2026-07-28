"use client";
import { useEffect, useState } from "react";
import { AMR, TEXT1, TITLE } from "../lib/tokens";

export interface Slide { id: string; nombre: string; descripcion: string; foto: string; precio: number }

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
        <img key={s.id} src={`https://images.unsplash.com/${s.foto}?auto=format&fit=crop&w=1400&h=900&q=85`} alt={s.nombre}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.65) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(40px, 8vw, 80px) clamp(20px, 5vw, 60px)", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "clamp(12px, 1.5vw, 16px)", color: AMR, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Sugerencia del chef</div>
        <div style={{ fontFamily: TITLE, fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 900, color: TEXT1, marginBottom: 12, lineHeight: 1.1 }}>{slide.nombre}</div>
        <div style={{ fontSize: "clamp(15px, 2vw, 20px)", color: "#e8e0d8", maxWidth: 600, lineHeight: 1.6, marginBottom: 28 }}>{slide.descripcion}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: TITLE, fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900, color: AMR }}>{fmt(slide.precio)}</span>
          <a href="/carta" style={{ background: AMR, color: "#1a1200", borderRadius: 999, padding: "14px 32px", fontSize: "clamp(15px, 1.8vw, 18px)", fontWeight: 800, textDecoration: "none", cursor: "pointer", transition: "transform 0.2s", display: "inline-block" }}>Pedir ahora</a>
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
