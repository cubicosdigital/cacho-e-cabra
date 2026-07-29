import Image from "next/image";
import { MapPin, Clock, MessageSquareWarning } from "lucide-react";
import { getSupabase } from "../lib/supabase";
import { getEventos, fmtPrecio } from "../lib/eventos";
import { getSlides } from "../lib/banner";
import HomeBanner, { Slide } from "./HomeBanner";
import { resolverImagen } from "../lib/imagenes";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../lib/tokens";

// Los eventos destacados se editan desde el CMS, así que el home no se puede cachear.
export const dynamic = "force-dynamic";

interface Producto {
  id: string; nombre: string; descripcion: string; precio: number;
  categoria: string; foto: string; popular: boolean; disponible: boolean;
}

async function getProductosHome(): Promise<Producto[]> {
  try {
    const { data, error } = await getSupabase().from("productos").select("*").eq("disponible", true);
    if (error || !data) return [];
    return data as Producto[];
  } catch {
    return [];
  }
}

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

export default async function Home() {
  const productos = await getProductosHome();
  const chef = productos.filter(p => p.categoria === "chef");
  const destacados = productos.filter(p => p.popular && (p.categoria === "comida" || p.categoria === "tragos")).slice(0, 8);

  // Solo los eventos marcados como destacados en el CMS llegan al home.
  const eventosDestacados = (await getEventos()).filter(e => e.publicado && e.destacado);

  const eventoSlides: Slide[] = eventosDestacados.slice(0, 2).map(e => ({
    id: `evento-${e.id}`,
    nombre: e.titulo,
    descripcion: e.descripcion,
    foto: e.imagen,
    precio: e.precio,
    tipo: 'evento',
    botonTexto: 'Quiero ser parte',
    botonHref: `/eventos/${e.id}`,
  }));

  // Si el admin armó slides en el CMS, esos mandan. Si no, el banner se arma solo.
  const slidesCms = (await getSlides()).filter(s => s.activo && s.imagen);
  const banner: Slide[] = slidesCms.length > 0
    ? slidesCms.map(s => ({
        id: s.id,
        nombre: s.titulo,
        descripcion: s.descripcion,
        foto: s.imagen,
        precio: 0,
        etiqueta: s.etiqueta,
        ocultarPrecio: true,
        botonTexto: s.botonTexto,
        botonHref: s.botonHref,
      }))
    : [...eventoSlides, ...(chef.length > 0 ? chef : destacados)].slice(0, 6);

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG }}>
      {/* BANNER HOME - FULLSCREEN FIXED */}
      {banner.length > 0 && <HomeBanner slides={banner} />}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 60px", display: "flex", flexDirection: "column", gap: 56, position: "relative", zIndex: 1 }}>

        {/* DESTACADOS */}
        {destacados.length > 0 && (
          <section>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, marginBottom: 10, color: TEXT1 }}>⭐ Destacados</div>
            <div style={{ fontSize: 18, color: TEXT3, marginBottom: 28, fontWeight: 500 }}>Lo más pedido de la casa.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {destacados.map(p => (
                <a key={p.id} href="/carta" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: TEXT1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", display: "block", transition: "all 0.3s ease", cursor: "pointer", transform: "translateY(0)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolverImagen(p.foto, 400, 260)} alt={p.nombre} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{p.nombre}</div>
                    <div style={{ fontSize: 17, color: AMR, fontWeight: 800 }}>{fmt(p.precio)}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* EVENTOS DESTACADOS */}
        {eventosDestacados.length > 0 && (
          <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 40, background: `linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.04) 100%)`, borderRadius: 20, padding: 40 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, marginBottom: 10, color: TEXT1 }}>🎉 Eventos Exclusivos</div>
            <div style={{ fontSize: 18, color: TEXT3, marginBottom: 28, fontWeight: 500 }}>Vive experiencias únicas con nosotros.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24, marginBottom: 28 }}>
              {eventosDestacados.map(e => (
                <div key={e.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 56 }}>{e.emoji}</div>
                    <div>
                      <div style={{ fontSize: 28, fontFamily: TITLE, fontWeight: 900, color: AMR, lineHeight: 1 }}>{e.fechaCorta}</div>
                      <div style={{ fontSize: 14, color: AMR, fontWeight: 700, letterSpacing: "0.05em" }}>{e.mes}</div>
                    </div>
                  </div>
                  <h3 style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 18, marginBottom: 4, color: TEXT1 }}>{e.titulo}</h3>
                  <p style={{ fontSize: 12, color: AMR, fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>{e.subtitulo}</p>
                  <p style={{ fontSize: 13, color: TEXT2, marginBottom: 10, lineHeight: 1.5 }}>{e.descripcion}</p>
                  <p style={{ fontSize: 12, color: TEXT3, marginBottom: 14 }}>🕐 {e.hora} hrs | 💰 {fmtPrecio(e.precio)}</p>
                  <a href={`/eventos/${e.id}`} style={{ fontSize: 11, color: AMR, fontWeight: 700, textDecoration: "none", marginTop: "auto" }}>Ver información completa →</a>
                </div>
              ))}
            </div>
            <a href="/eventos" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `#FBBF24`, color: "#000", padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", transition: "all 0.3s ease" }}>
              Ver todos los eventos →
            </a>
          </section>
        )}

        {/* RECOMENDACIONES DEL CHEF */}
        {chef.length > 0 && (
          <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 40 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, marginBottom: 10, color: TEXT1 }}>👨‍🍳 Recomendaciones del Chef</div>
            <div style={{ fontSize: 18, color: TEXT3, marginBottom: 28, fontWeight: 500 }}>Las creaciones que no te puedes perder.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {chef.map(p => (
                <a key={p.id} href="/carta" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: TEXT1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", display: "block", transition: "all 0.3s ease", cursor: "pointer", transform: "translateY(0)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolverImagen(p.foto, 500, 320)} alt={p.nombre} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ fontFamily: TITLE, fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{p.nombre}</div>
                    <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.6, marginBottom: 12 }}>{p.descripcion}</div>
                    <div style={{ fontSize: 17, color: AMR, fontWeight: 800 }}>{fmt(p.precio)}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* UBICACIÓN CON MAPA */}
        <div id="ubicacion" style={{ scrollMarginTop: 88, borderTop: `1px solid ${BORDER}`, paddingTop: 40 }}>
          <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: TEXT1, marginBottom: 28 }}>Ubicación</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 17, color: TEXT1, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Plaza de Llolleo</div>
                San Antonio, Chile
              </div>
              <a href="https://maps.google.com/?q=Plaza+de+Llolleo,+San+Antonio,+Chile" target="_blank" rel="noopener noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: AMR, textDecoration: "none" }}>
                Cómo llegar →
              </a>
            </div>
            <iframe style={{ width: "100%", height: 300, borderRadius: 16, border: "none" }}
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3285.1234567890123!2d-71.6096!3d-33.5901!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662c5c5c5c5c5c5%3A0x1234567890!2sPlaza%20de%20Llolleo!5e0!3m2!1ses!2scl!4v1234567890" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER}`, background: "#232019", position: "relative", zIndex: 10 }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "48px 20px 28px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32,
        }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={264} height={210} />
            </div>
            <div style={{ fontSize: 14, color: TEXT3, lineHeight: 1.7, maxWidth: 280 }}>
              Café de día, bar de noche. Cafetería, brunch, comida y tragos en el corazón de la Plaza de Llolleo, San Antonio.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: TEXT2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Navegación</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/carta" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: TEXT3, textDecoration: "none" }}>Carta</a>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: TEXT2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Visítanos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <a href="https://maps.google.com/?q=Plaza+de+Llolleo,+San+Antonio,+Chile" target="_blank" rel="noopener noreferrer"
                 style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: TEXT3, textDecoration: "none", lineHeight: 1.5 }}>
                <MapPin size={16} strokeWidth={2} color={AMR} style={{ flexShrink: 0, marginTop: 2 }} />
                Plaza de Llolleo, San Antonio, Chile
              </a>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: TEXT3, lineHeight: 1.6 }}>
                <Clock size={16} strokeWidth={2} color={AMR} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Lun – Jue · 09:00 – 23:00<br />
                  Vie – Sáb · 09:00 – 01:00<br />
                  Domingo · 09:00 – 20:00
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: `1px solid ${BORDER}`, padding: "18px 20px", maxWidth: 1100, margin: "0 auto",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, width: "100%", flexDirection: "column", alignItems: "flex-start",
        }}>
          <div style={{ fontSize: 13, color: TEXT3, width: "100%" }}>
            © {new Date().getFullYear()} Cacho Cabra · Bar · Restaurante · Cafetería
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%", marginTop: 16 }}>
            <a href="/reclamos" style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: TEXT1,
              textDecoration: "none", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 18px",
            }}>
              <MessageSquareWarning size={14} strokeWidth={2} />
              Sugerencias y reclamos
            </a>
            <a href="/admin/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: TEXT1,
              textDecoration: "none", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 18px",
            }}>
              Admin
            </a>
          </div>
          <div style={{ fontSize: 12, color: TEXT3, marginTop: 16, width: "100%" }}>
            Creado por <a href="https://cubicosdigital.cl" target="_blank" rel="noopener noreferrer" style={{ color: AMR, textDecoration: "none", fontWeight: 600 }}>Cubicos Digital</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
