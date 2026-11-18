import Link from "next/link";
import { etiquetaDia, platosLimpios, precioTexto, type MenuDia } from "../../lib/menu-dia";
import { BORDER, SURFACE, TEXT1, TEXT2, TEXT3, AMR, ROJO, FONT, TITLE } from "../../lib/tokens";

/** Un menú del día: el afiche a la izquierda y los platos con su detalle a la derecha. */
export default function VistaMenu({ menu, esHoy }: { menu: MenuDia; esHoy: boolean }) {
  const d = etiquetaDia(menu.fecha);
  const platos = platosLimpios(menu.platos);

  return (
    <section className="md-vista" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/menu-dia/${menu.id}/imagen?tipo=historia&v=${encodeURIComponent(menu.actualizadoEn)}`}
          alt={`Menú del día ${d.dia} ${d.fecha} en Cacho Cabra`}
          width={1080}
          height={1920}
          style={{ width: "100%", height: "auto", borderRadius: 20, display: "block", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 700, letterSpacing: 6, color: AMR }}>
            <span style={{ width: 30, height: 4, background: ROJO, display: "inline-block" }} />
            {esHoy ? "HOY" : "MENÚ DEL DÍA"}
          </div>
          <h2 style={{ fontFamily: TITLE, fontSize: "clamp(32px, 5vw, 46px)", fontWeight: 900, lineHeight: 1.05, margin: "10px 0 6px" }}>
            {d.dia} <span style={{ color: TEXT3, fontWeight: 700, fontSize: "0.62em" }}>{d.fecha}</span>
          </h2>
          <div style={{ fontSize: 18, fontWeight: 700, color: AMR }}>Desde las {menu.horaDesde} hrs</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {platos.map((p, i) => (
            <article key={i} style={{ display: "flex", gap: 16, alignItems: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, color: TEXT1 }}>{p.nombre}</div>
                {p.descripcion ? <div style={{ fontSize: 15, color: TEXT3, marginTop: 3, lineHeight: 1.4 }}>{p.descripcion}</div> : null}
              </div>
              {p.precio != null ? <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: AMR, flexShrink: 0 }}>{precioTexto(p.precio)}</div> : null}
            </article>
          ))}
        </div>

        {menu.nota ? <div style={{ fontSize: 16, color: TEXT2 }}>{menu.nota}.</div> : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Link href="/carta" style={{ display: "inline-flex", background: AMR, color: "#1a1200", borderRadius: 12, padding: "13px 22px", fontSize: 16, fontWeight: 800, textDecoration: "none", fontFamily: FONT }}>
            Ver la carta completa
          </Link>
          <span style={{ fontSize: 14, color: TEXT3 }}>Del Canelo N° 439, Llolleo</span>
        </div>
      </div>
    </section>
  );
}
