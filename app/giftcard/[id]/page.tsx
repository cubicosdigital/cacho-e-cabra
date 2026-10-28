import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { obtenerGiftcard } from "../../../lib/giftcards-db";
import { CONDICIONES, estaVencida, fechaCorta, valorTexto, mensajeWhatsapp, urlGiftcard } from "../../../lib/giftcards";
import { qrSvgDataUri } from "../../../lib/giftcard-qr";
import { BG, SURFACE, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../lib/tokens";

// Es la página que recibe el cliente por WhatsApp. Se lee de la base en cada visita
// (el estado cambia al canjearla), así que no se puede cachear.
export const dynamic = "force-dynamic";

const SITIO = "https://cachocabrabar.cl";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = await obtenerGiftcard(id);
  if (!g) return { title: "Gift Card · Cacho Cabra", robots: { index: false, follow: false } };

  const titulo = "Tienes una Gift Card de Cacho Cabra";
  const descripcion = g.tipo === "porcentaje"
    ? `${g.valor}% de descuento en tu consumo. Ábrela para verla y descargarla.`
    : `${valorTexto(g.tipo, g.valor)} para canjear en tu consumo. Ábrela para verla y descargarla.`;
  const imagen = { url: `/api/giftcards/${id}/image`, width: 1200, height: 630, alt: "Gift Card Cacho Cabra" };

  return {
    title: titulo,
    description: descripcion,
    // Cada gift card es privada de quien tiene el link: que no aparezca en buscadores.
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descripcion, url: `${SITIO}/giftcard/${id}`, siteName: "Cacho Cabra", locale: "es_CL", type: "website", images: [imagen] },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: [imagen.url] },
  };
}

const boton: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: "13px 22px",
  fontSize: 16, fontWeight: 800, textDecoration: "none", fontFamily: FONT, border: "none", cursor: "pointer",
};

export default async function GiftcardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await obtenerGiftcard(id);
  if (!g) notFound();

  const vencida = g.estado === "activa" && estaVencida(g);
  const aviso =
    g.estado === "canjeada" ? { texto: "Esta gift card ya fue canjeada.", color: AMR, bg: "#3a2f10" }
    : g.estado === "anulada" ? { texto: "Esta gift card fue anulada.", color: "#fca5a5", bg: "#2a1212" }
    : vencida ? { texto: `Esta gift card venció el ${fechaCorta(g.vence)}.`, color: "#fca5a5", bg: "#2a1212" }
    : null;

  // Solo las gift cards en $ llevan QR (las de % se canjean por su código), y solo mientras se pueden usar.
  const qr = g.tipo === "monto" && g.estado === "activa" && !vencida ? qrSvgDataUri(urlGiftcard(g.id)) : null;

  const wa = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp({ para: "", tipo: g.tipo, valor: g.valor, codigo: g.codigo }, `${SITIO}/giftcard/${g.id}`))}`;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "40px 16px 64px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: TITLE, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900, lineHeight: 1.1 }}>
            {g.para ? `${g.para}, tienes una gift card` : "Tienes una gift card"}
          </div>
          <div style={{ fontSize: 17, color: TEXT3, marginTop: 8 }}>Cacho Cabra te regala una experiencia.</div>
        </div>

        {aviso && (
          <div style={{ background: aviso.bg, border: `1px solid ${aviso.color}`, color: aviso.color, borderRadius: 12, padding: "12px 18px", fontSize: 16, fontWeight: 700, textAlign: "center" }}>
            {aviso.texto}
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/giftcards/${g.id}/image`}
          alt={`Gift card Cacho Cabra ${valorTexto(g.tipo, g.valor)}`}
          width={1200}
          height={630}
          style={{ width: "100%", height: "auto", borderRadius: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.5)", display: "block", opacity: aviso && g.estado !== "activa" ? 0.55 : 1 }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <a href={`/api/giftcards/${g.id}/pdf`} download style={{ ...boton, background: AMR, color: "#1a1200" }}>Descargar PDF</a>
          <a href={`/api/giftcards/${g.id}/image`} download={`gift-card-${g.codigo}.png`} style={{ ...boton, background: SURFACE, color: TEXT1, border: `1px solid ${BORDER}` }}>Descargar imagen</a>
          <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...boton, background: "#25D366", color: "#fff" }}>Compartir por WhatsApp</a>
        </div>

        {qr && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Tu código QR</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Código QR de la gift card ${g.codigo}`} width={260} height={260} style={{ width: 260, maxWidth: "100%", height: "auto", borderRadius: 14, display: "block" }} />
            <div style={{ fontSize: 15, color: TEXT3, textAlign: "center" }}>Muéstralo en caja para que lo lean y canjear tu gift card.</div>
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Cómo canjearla</div>
          <div style={{ fontSize: 16, color: TEXT2, lineHeight: 1.6 }}>
            Muestra esta tarjeta o dicta tu código en caja: <strong style={{ color: AMR, letterSpacing: 1 }}>{g.codigo}</strong>.
            {g.vence ? <> Válida hasta el {fechaCorta(g.vence)}.</> : null}
          </div>
          <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700 }}>{CONDICIONES}</div>
          <div style={{ fontSize: 15, color: TEXT3 }}>Cacho Cabra · Del Canelo N° 439, Llolleo, San Antonio</div>
        </div>

      </div>
    </div>
  );
}
