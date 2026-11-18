import type { Metadata } from "next";
import { CAMPANA_NAVIDAD, CONDICIONES, DISENO_NAVIDAD, fechaLarga, hoyChile, linkCompraNavidad, miles } from "../../lib/giftcards";
import { BG, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../lib/tokens";
import { bolaUri } from "../../lib/diseno";

// Depende de la fecha de hoy (la campaña termina), así que no se cachea.
export const dynamic = "force-dynamic";

const TITULO = "Compra y regala tu Gift Cacho Cabra";
const DESCRIPCION = `Gift Card Navideña de ${CAMPANA_NAVIDAD.montos.map(m => `$${miles(m)}`).join(" o ")}. Válida para cobrar entre martes y jueves en Cacho Cabra, hasta el ${fechaLarga(CAMPANA_NAVIDAD.vence)}.`;

export const metadata: Metadata = {
  title: `${TITULO} · Cacho Cabra`,
  description: DESCRIPCION,
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "https://cachocabrabar.cl/regala",
    siteName: "Cacho Cabra",
    locale: "es_CL",
    type: "website",
    images: [{ url: `/api/regala/tarjeta?valor=${CAMPANA_NAVIDAD.montos[0]}&v=${DISENO_NAVIDAD}`, width: 1200, height: 630, alt: "Gift Card Navideña Cacho Cabra" }],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: [`/api/regala/tarjeta?valor=${CAMPANA_NAVIDAD.montos[0]}&v=${DISENO_NAVIDAD}`] },
};

const ROJO_NAVIDAD = "#c4262e";
const BORDE = "rgba(251,191,36,0.28)";

// Bolas que cuelgan del borde superior: posición (% del ancho), largo del hilo y colores.
const BOLAS = [
  { x: 2, largo: 60, color: "#c4262e", claro: "#ff7a80", t: 5.2 },
  { x: 7, largo: 110, color: "#d4a017", claro: "#fde68a", t: 6.4 },
  { x: 12, largo: 36, color: "#9ca3af", claro: "#f3f4f6", t: 5.8 },
  { x: 86, largo: 40, color: "#9ca3af", claro: "#f3f4f6", t: 6.1 },
  { x: 91, largo: 100, color: "#c4262e", claro: "#ff7a80", t: 5.5 },
  { x: 95.5, largo: 52, color: "#d4a017", claro: "#fde68a", t: 6.8 },
];

const PASOS = [
  { n: "1", titulo: "Elige el monto", texto: `Gift Card de ${CAMPANA_NAVIDAD.montos.map(m => `$${miles(m)}`).join(" o ")}.` },
  { n: "2", titulo: "Escríbenos por WhatsApp", texto: "Con un toque se abre la conversación con tu pedido ya escrito." },
  { n: "3", titulo: "Regálala", texto: "Recibes tu Gift Card digital, lista para enviar a quien quieras." },
];

export default function RegalaPage() {
  const terminada = hoyChile() > CAMPANA_NAVIDAD.vence;
  const vence = fechaLarga(CAMPANA_NAVIDAD.vence);

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <style>{`
        .rg-montos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
        .rg-pasos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 860px) { .rg-montos { grid-template-columns: 1fr; } .rg-pasos { grid-template-columns: 1fr; } }
        .rg-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .rg-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .rg-bola { position: absolute; top: 0; width: 40px; transform-origin: 50% 0; animation: rg-balanceo 6s ease-in-out infinite; }
        @keyframes rg-balanceo { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @media (prefers-reduced-motion: reduce) { .rg-bola { animation: none; } }
        @media (max-width: 700px) { .rg-bola-extra { display: none; } }
      `}</style>

      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 0, pointerEvents: "none" }}>
        {BOLAS.map((b, i) => (
          <div key={i} className={`rg-bola${i % 2 ? " rg-bola-extra" : ""}`} style={{ left: `${b.x}%`, animationDuration: `${b.t}s` }}>
            <div style={{ position: "absolute", left: 19, top: 0, width: 2, height: b.largo, background: "rgba(251,191,36,0.6)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bolaUri(b.color, b.claro)} width={40} height={58} alt="" style={{ position: "absolute", left: 0, top: b.largo, display: "block", maxWidth: "none" }} />
          </div>
        ))}
      </div>

      <main style={{ position: "relative", maxWidth: 1040, margin: "0 auto", padding: "60px 20px 90px", display: "flex", flexDirection: "column", gap: 44 }}>

        <header style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, fontWeight: 700, letterSpacing: 7, color: AMR }}>
            <span style={{ width: 34, height: 4, background: ROJO_NAVIDAD, display: "inline-block" }} />
            NAVIDAD
            <span style={{ width: 34, height: 4, background: ROJO_NAVIDAD, display: "inline-block" }} />
          </div>
          <h1 style={{ fontFamily: TITLE, fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 900, lineHeight: 1.15, margin: 0, textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}>
            Compra y regala<br />tu Giftcard <span style={{ color: AMR }}>Cacho Cabra</span>
          </h1>
          <p style={{ fontSize: 18, color: TEXT3, lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
            Regala una experiencia: buena comida y buenos tragos en Cacho Cabra.
          </p>
        </header>

        {terminada && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 12, padding: "14px 20px", fontSize: 16, textAlign: "center" }}>
            La campaña navideña terminó el {vence}.
          </div>
        )}

        <section className="rg-montos">
          {CAMPANA_NAVIDAD.montos.map(monto => (
            <div key={monto} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDE}`, borderTop: `4px solid ${ROJO_NAVIDAD}`, borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/regala/tarjeta?valor=${monto}&v=${DISENO_NAVIDAD}`}
                alt={`Gift Card Navideña Cacho Cabra de $${miles(monto)}`}
                width={1200}
                height={630}
                style={{ width: "100%", height: "auto", borderRadius: 14, display: "block", boxShadow: "0 14px 36px rgba(0,0,0,0.45)" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontFamily: TITLE, fontSize: 34, fontWeight: 900, color: AMR, lineHeight: 1 }}>${miles(monto)}</div>
                {terminada ? (
                  <span style={{ color: TEXT3, fontSize: 15 }}>Campaña finalizada</span>
                ) : (
                  <a
                    className="rg-btn"
                    href={linkCompraNavidad(monto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", borderRadius: 12, padding: "13px 22px", fontSize: 16, fontWeight: 800, textDecoration: "none" }}
                  >
                    Comprar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, margin: 0 }}>Cómo funciona</h2>
          <div className="rg-pasos">
            {PASOS.map(p => (
              <div key={p.n} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDE}`, borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontFamily: TITLE, fontSize: 28, fontWeight: 900, color: "#ff7a80", lineHeight: 1 }}>{p.n}</div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{p.titulo}</div>
                <div style={{ fontSize: 15, color: TEXT3, lineHeight: 1.5 }}>{p.texto}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDE}`, position: "relative", borderLeft: `4px solid ${ROJO_NAVIDAD}`, borderRadius: 16, padding: "22px 26px", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, margin: 0 }}>Condiciones</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 16, color: TEXT2, lineHeight: 1.5 }}>
            <li>Válida para cobrar entre {CAMPANA_NAVIDAD.diasTexto.replace(" a ", " y ")} en Cacho Cabra.</li>
            <li>Válida hasta el {vence}.</li>
            <li>{CONDICIONES}</li>
          </ul>
          <div style={{ fontSize: 15, color: TEXT3, marginTop: 4 }}>Cacho Cabra · Del Canelo N° 439, Llolleo, San Antonio</div>
        </section>
      </main>
    </div>
  );
}
