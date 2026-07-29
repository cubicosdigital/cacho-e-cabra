import { getEventos, TIPO_META, ESTADO_META, fmtPrecio } from "../../lib/eventos";
import RegistroButton from "./RegistroButton";
import { resolverImagen } from "../../lib/imagenes";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../lib/tokens";

// Los eventos se editan desde el CMS, así que la página no se puede cachear.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Eventos · Cacho Cabra",
  description: "Cocina en vivo, cenas clandestinas, fiestas y aniversarios en Cacho Cabra, Plaza de Llolleo.",
};

export default async function EventosPage() {
  const eventos = (await getEventos()).filter(e => e.publicado);

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh" }}>
      <style>{`
        .ev-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        @media (max-width: 1080px) { .ev-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 820px)  { .ev-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px)  { .ev-grid { grid-template-columns: 1fr; } }
        .ev-card:hover { border-color: ${AMR}; }
      `}</style>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "60px 20px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: TITLE, fontSize: 44, fontWeight: 900, marginBottom: 10, color: TEXT1 }}>
            🎉 Eventos
          </h1>
          <p style={{ fontSize: 17, color: TEXT3, lineHeight: 1.6, maxWidth: 620 }}>
            Cocina en vivo, cenas clandestinas, fiestas y aniversarios. Elige tu evento y reserva tu cupo.
          </p>
        </div>

        <div className="ev-grid">
          {eventos.map(evento => {
            const disponibles = evento.cupos - evento.registrados;
            const agotado = disponibles <= 0;
            const meta = TIPO_META[evento.tipo];

            return (
              <div
                key={evento.id}
                className="ev-card"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ position: "relative", height: 130 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolverImagen(evento.imagen, 400, 260)}
                    alt={evento.titulo}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{
                    position: "absolute", top: 10, left: 10, background: meta.color, color: "#fff",
                    padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {meta.label}
                  </div>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, color: AMR, lineHeight: 1 }}>
                      {evento.fechaCorta}
                    </span>
                    <span style={{ fontSize: 11, color: AMR, fontWeight: 700, letterSpacing: "0.05em" }}>
                      {evento.mes}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT3, marginLeft: "auto" }}>{evento.hora} hrs</span>
                  </div>

                  <div>
                    <h2 style={{ fontFamily: TITLE, fontSize: 16, fontWeight: 800, color: TEXT1, lineHeight: 1.25, margin: 0 }}>
                      {evento.titulo}
                    </h2>
                    <div style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: "0.06em", marginTop: 4 }}>
                      {evento.subtitulo}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, paddingTop: 4 }}>
                    <span style={{ color: AMR, fontWeight: 800 }}>{fmtPrecio(evento.precio)}</span>
                    <span style={{ color: agotado ? "#fca5a5" : TEXT3, fontSize: 11 }}>
                      {agotado ? "Sin cupos" : `${disponibles} cupos`}
                    </span>
                  </div>

                  {evento.estado !== "abierto" && (
                    <div style={{ fontSize: 10, color: TEXT3, background: SURF2, borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                      {ESTADO_META[evento.estado]}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", paddingTop: 6 }}>
                    <a
                      href={`/eventos/${evento.id}`}
                      style={{
                        width: "100%", padding: "10px 0", background: SURF2, color: TEXT1,
                        border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, fontWeight: 700,
                        textDecoration: "none", textAlign: "center", display: "block",
                      }}
                    >
                      Ver información completa
                    </a>
                    <RegistroButton eventoId={evento.id} titulo={evento.titulo} agotado={agotado} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
