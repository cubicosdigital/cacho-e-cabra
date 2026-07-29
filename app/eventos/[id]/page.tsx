import { notFound } from "next/navigation";
import { Clock, Users, DollarSign, MapPin, Award, ChevronLeft } from "lucide-react";
import { getEvento, TIPO_META, ESTADO_META, fmtPrecio } from "../../../lib/eventos";
import RegistroButton from "../RegistroButton";
import { resolverImagen } from "../../../lib/imagenes";
import { BG, SURFACE, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../lib/tokens";

// Los eventos se editan desde el CMS, así que la página no se puede cachear.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await getEvento(id);
  if (!evento) return { title: "Evento no encontrado · Cacho Cabra" };
  return { title: `${evento.titulo} · Cacho Cabra`, description: evento.descripcion };
}

export default async function EventoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await getEvento(id);
  if (!evento || !evento.publicado) notFound();

  const disponibles = evento.cupos - evento.registrados;
  const agotado = disponibles <= 0;
  const meta = TIPO_META[evento.tipo];

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh" }}>
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/eventos" style={{ color: AMR, display: "flex", alignItems: "center", textDecoration: "none" }}>
            <ChevronLeft size={26} />
          </a>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, flex: 1 }}>{evento.titulo}</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 380, overflow: "hidden", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolverImagen(evento.imagen, 1400, 600)}
          alt={evento.titulo}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", top: 20, left: 20, background: meta.color, color: "#fff",
          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {meta.label}
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 40 }}>{evento.emoji}</span>
            <div>
              <div style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: AMR, lineHeight: 1 }}>
                {evento.fechaCorta}
              </div>
              <div style={{ fontSize: 13, color: AMR, fontWeight: 700, letterSpacing: "0.06em" }}>{evento.mes}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: TEXT3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>
            {evento.subtitulo}
          </div>
          <p style={{ fontSize: 18, color: TEXT2, lineHeight: 1.8, maxWidth: 800, marginBottom: 24 }}>
            {evento.descripcion}
          </p>
          <div style={{ maxWidth: 280 }}>
            <RegistroButton eventoId={evento.id} titulo={evento.titulo} agotado={agotado} size="lg" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 24, marginBottom: 56, paddingBottom: 40, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", gap: 14 }}>
            <Clock size={30} color={AMR} />
            <div>
              <div style={{ fontSize: 11, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Fecha y hora</div>
              <div style={{ fontSize: 15, color: TEXT1, fontWeight: 700 }}>{evento.fecha}</div>
              <div style={{ fontSize: 14, color: TEXT2 }}>{evento.hora} hrs · {evento.duracion}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <MapPin size={30} color={AMR} />
            <div>
              <div style={{ fontSize: 11, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Ubicación</div>
              <div style={{ fontSize: 15, color: TEXT1, fontWeight: 700 }}>{evento.lugar}</div>
              <div style={{ fontSize: 14, color: TEXT2 }}>Cacho Cabra · Bar & Restaurante</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <DollarSign size={30} color={AMR} />
            <div>
              <div style={{ fontSize: 11, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Valor</div>
              <div style={{ fontSize: 19, color: AMR, fontWeight: 900 }}>{fmtPrecio(evento.precio)}</div>
              {evento.promo && (
                <div style={{ fontSize: 12, color: TEXT3, marginTop: 4 }}>
                  Promo: {evento.promo.texto} · {fmtPrecio(evento.promo.precio)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <Users size={30} color={AMR} />
            <div>
              <div style={{ fontSize: 11, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Cupos</div>
              <div style={{ fontSize: 15, color: TEXT1, fontWeight: 700 }}>{disponibles} de {evento.cupos}</div>
              <div style={{ fontSize: 12, color: TEXT2 }}>{ESTADO_META[evento.estado]}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: TITLE, fontSize: 28, fontWeight: 900, marginBottom: 24, color: TEXT1 }}>
            Lo que incluye esta experiencia
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {evento.detalles.map((detalle, i) => (
              <div key={i} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 15, color: TEXT1, fontWeight: 600, lineHeight: 1.5 }}>{detalle}</span>
              </div>
            ))}
          </div>
        </div>

        {(evento.gastronomia || evento.experiencia) && (
          <div style={{ background: `${AMR}15`, border: `1px solid ${AMR}40`, borderRadius: 20, padding: 36, marginBottom: 56, textAlign: "center" }}>
            <Award size={44} color={AMR} style={{ margin: "0 auto 14px" }} />
            <h3 style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: TEXT1, marginBottom: 10 }}>Propuesta</h3>
            {evento.gastronomia && (
              <p style={{ fontSize: 16, color: TEXT2, lineHeight: 1.8, maxWidth: 600, margin: "0 auto 12px" }}>{evento.gastronomia}</p>
            )}
            {evento.experiencia && (
              <p style={{ fontSize: 14, color: TEXT3, fontStyle: "italic" }}>{evento.experiencia}</p>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", paddingTop: 36, borderTop: `1px solid ${BORDER}` }}>
          <h2 style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, marginBottom: 12, color: TEXT1 }}>
            ¿Listo para vivir esta experiencia?
          </h2>
          <p style={{ fontSize: 16, color: TEXT2, marginBottom: 24 }}>Asegura tu lugar, los cupos son limitados.</p>
          <div style={{ maxWidth: 300, margin: "0 auto" }}>
            <RegistroButton eventoId={evento.id} titulo={evento.titulo} agotado={agotado} size="lg" />
          </div>
          <a href="/eventos" style={{ display: "inline-block", marginTop: 20, fontSize: 14, color: TEXT3, textDecoration: "none" }}>
            ← Ver todos los eventos
          </a>
        </div>
      </main>
    </div>
  );
}
