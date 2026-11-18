/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) solo entiende <img>, no next/image. */
import { ImageResponse } from "next/og";
import { CAMPANA_NAVIDAD, fechaLarga, miles } from "./giftcards";
import { AMBAR, ROJO, TEXTO, TENUE, bolaUri, copoUri, pngAJpg, recursos, type Recursos } from "./diseno";

// Gráficas de la campaña navideña para redes sociales. Mismo estilo minimalista de la web:
// fondo oscuro cálido, ámbar, tipografía Raleway/DM Sans y mucho aire.

export type FormatoPromo = "historia" | "post";

export const FORMATOS_PROMO: Record<FormatoPromo, { ancho: number; alto: number; nombre: string; archivo: string }> = {
  historia: { ancho: 1080, alto: 1920, nombre: "Historia (1080×1920)", archivo: "gift-card-navidad-historia.jpg" },
  post: { ancho: 1080, alto: 1350, nombre: "Post (1080×1350)", archivo: "gift-card-navidad-post.jpg" },
};

function Linea({ children, color = TENUE, size = 34 }: { children: string; color?: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, fontWeight: 500, color, textAlign: "center" }}>
      {children}
    </div>
  );
}

function Monto({ valor, ancho, size }: { valor: number; ancho: number; size: number }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: ancho,
        border: "2px solid rgba(251,191,36,0.55)", borderRadius: 28, backgroundColor: "rgba(255,255,255,0.04)", padding: "26px 0 24px",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Raleway", fontWeight: 900, fontSize: size, lineHeight: 1, color: AMBAR }}>{`$${miles(valor)}`}</div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 22, fontWeight: 700, letterSpacing: 6, color: TENUE }}>GIFT CARD</div>
    </div>
  );
}

function grafica(formato: FormatoPromo, r: Recursos) {
  const { ancho, alto } = FORMATOS_PROMO[formato];
  const historia = formato === "historia";
  const copo = copoUri("#f5f2ee");
  const [m1, m2] = CAMPANA_NAVIDAD.montos;

  return (
    <div
      style={{
        width: ancho, height: alto, display: "flex", position: "relative", fontFamily: "DM Sans", color: TEXTO,
        backgroundImage: "linear-gradient(160deg, #1f1d1b 0%, #080808 100%)",
      }}
    >
      {/* Resplandores: cálido al centro, rojizo arriba */}
      <div style={{ position: "absolute", left: 0, top: historia ? 560 : 380, width: ancho, height: 760, display: "flex", backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.13) 0%, rgba(251,191,36,0) 68%)" }} />
      <div style={{ position: "absolute", left: 140, top: 0, width: 800, height: 520, display: "flex", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(196,38,46,0.24) 0%, rgba(196,38,46,0) 70%)" }} />

      {/* Bolas colgando del marco y copos sutiles */}
      {[
        { x: 124, largo: 70, color: "#c4262e", claro: "#ff7a80" },
        { x: 214, largo: 150, color: "#d4a017", claro: "#fde68a" },
        { x: 826, largo: 120, color: "#9ca3af", claro: "#f3f4f6" },
        { x: 916, largo: 56, color: "#c4262e", claro: "#ff7a80" },
      ].map(b => (
        <div key={b.x} style={{ position: "absolute", left: b.x, top: 36, width: 40, height: b.largo + 58, display: "flex" }}>
          <div style={{ position: "absolute", left: 19, top: 0, width: 2, height: b.largo, display: "flex", backgroundColor: "rgba(251,191,36,0.6)" }} />
          <img src={bolaUri(b.color, b.claro)} width={40} height={58} alt="" style={{ position: "absolute", left: 0, top: b.largo }} />
        </div>
      ))}
      <img src={copo} width={44} height={44} alt="" style={{ position: "absolute", left: 150, top: historia ? 330 : 250, opacity: 0.26 }} />
      <img src={copo} width={54} height={54} alt="" style={{ position: "absolute", right: 140, top: historia ? 290 : 220, opacity: 0.3 }} />
      <img src={copo} width={52} height={52} alt="" style={{ position: "absolute", right: 150, bottom: historia ? 270 : 190, opacity: 0.2 }} />

      {/* Marco */}
      <div style={{ position: "absolute", left: 36, top: 36, right: 36, bottom: 36, display: "flex", border: "2px solid rgba(251,191,36,0.45)", borderRadius: 44 }} />

      {/* Contenido */}
      <div
        style={{
          position: "absolute", left: 90, right: 90, top: historia ? 150 : 96, bottom: historia ? 150 : 90, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={r.logo} width={historia ? 380 : 320} height={historia ? 132 : 111} alt="Cacho Cabra" />
          <div style={{ display: "flex", alignItems: "center", marginTop: historia ? 52 : 34 }}>
            <div style={{ display: "flex", width: 56, height: 5, backgroundColor: ROJO, marginRight: 20 }} />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 12, color: AMBAR }}>NAVIDAD</div>
            <div style={{ display: "flex", width: 56, height: 5, backgroundColor: ROJO, marginLeft: 20 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Raleway", fontWeight: 900, lineHeight: 1.06, textAlign: "center" }}>
          <div style={{ display: "flex", fontSize: historia ? 100 : 86 }}>Compra y regala</div>
          <div style={{ display: "flex", fontSize: historia ? 100 : 86 }}>tu Gift</div>
          <div style={{ display: "flex", fontSize: historia ? 112 : 96, color: AMBAR }}>Cacho Cabra</div>
        </div>

        {historia ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Monto valor={m1} ancho={700} size={128} />
            <div style={{ display: "flex", margin: "18px 0", fontSize: 26, fontWeight: 700, letterSpacing: 6, color: TENUE }}>O</div>
            <Monto valor={m2} ancho={700} size={128} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Monto valor={m1} ancho={410} size={82} />
            <div style={{ display: "flex", margin: "0 22px", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: TENUE }}>O</div>
            <Monto valor={m2} ancho={410} size={82} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Linea color={TEXTO} size={historia ? 36 : 32}>{`Válida para cobrar entre ${CAMPANA_NAVIDAD.diasTexto.replace(" a ", " y ")}`}</Linea>
          <Linea color={TEXTO} size={historia ? 36 : 32}>en Cacho Cabra</Linea>
          <div style={{ display: "flex", marginTop: 14 }}>
            <Linea size={historia ? 30 : 27}>{`Válida hasta el ${fechaLarga(CAMPANA_NAVIDAD.vence)}`}</Linea>
          </div>
          <div style={{ display: "flex", marginTop: historia ? 44 : 30, backgroundColor: AMBAR, color: "#1a1200", borderRadius: 999, padding: "16px 44px", fontSize: historia ? 34 : 30, fontWeight: 700 }}>
            cachocabrabar.cl/regala
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 24, fontWeight: 500, color: TENUE }}>Del Canelo N° 439 · Llolleo</div>
        </div>
      </div>
    </div>
  );
}

/** JPG de la gráfica, listo para subir a Instagram. */
export async function renderPromoJpg(formato: FormatoPromo): Promise<Buffer> {
  const r = await recursos();
  const { ancho, alto } = FORMATOS_PROMO[formato];
  const res = new ImageResponse(grafica(formato, r), { width: ancho, height: alto, fonts: r.fuentes });
  return pngAJpg(Buffer.from(await res.arrayBuffer()));
}
