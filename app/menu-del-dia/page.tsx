import Link from "next/link";
import type { Metadata } from "next";
import { etiquetaDia, fechaValida, hoyChile, platosLimpios } from "../../lib/menu-dia";
import { menusPublicados } from "../../lib/menu-dia-db";
import VistaMenu from "./VistaMenu";
import { BG, BORDER, SURFACE, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../lib/tokens";

// El menú cambia cada día desde el admin: la página no se puede cachear.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ fecha?: string }> };

async function elegir(fechaPedida?: string) {
  const hoy = hoyChile();
  const menus = await menusPublicados(14, hoy);
  const elegido = (fechaPedida && fechaValida(fechaPedida) ? menus.find(m => m.fecha === fechaPedida) : undefined) ?? menus.find(m => m.fecha === hoy) ?? menus[0] ?? null;
  return { hoy, menus, elegido };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { elegido } = await elegir((await searchParams).fecha);
  const titulo = "Menú del día · Cacho Cabra";
  if (!elegido) return { title: titulo, description: "El menú del día del chef en Cacho Cabra, Plaza de Llolleo." };

  const d = etiquetaDia(elegido.fecha);
  const descripcion = `${d.dia} ${d.fecha}, desde las ${elegido.horaDesde} hrs: ${platosLimpios(elegido.platos).map(p => p.nombre).join(" · ")}`.slice(0, 300);
  const imagen = { url: `/api/menu-dia/${elegido.id}/imagen?tipo=portada&v=${encodeURIComponent(elegido.actualizadoEn)}`, width: 1080, height: 1350, alt: `Menú del día ${d.dia} ${d.fecha}` };
  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, url: "https://cachocabrabar.cl/menu-del-dia", siteName: "Cacho Cabra", locale: "es_CL", type: "website", images: [imagen] },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: [imagen.url] },
  };
}

export default async function MenuDelDiaPage({ searchParams }: Props) {
  const { hoy, menus, elegido } = await elegir((await searchParams).fecha);

  return (
    <div style={{ fontFamily: FONT, color: TEXT1, background: BG, minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 860px) { .md-vista { grid-template-columns: 1fr !important; } }
        .md-chip { transition: border-color 0.15s ease, color 0.15s ease; }
        .md-chip:hover { border-color: ${AMR}; }
      `}</style>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "60px 20px 90px", display: "flex", flexDirection: "column", gap: 36 }}>
        <header>
          <h1 style={{ fontFamily: TITLE, fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 10px" }}>Menú del día</h1>
          <p style={{ fontSize: 18, color: TEXT3, lineHeight: 1.6, maxWidth: 580, margin: 0 }}>Lo que cocina el chef: platos de la casa, cada día. También puedes pedir de nuestra carta.</p>
        </header>

        {menus.length > 1 && (
          <nav aria-label="Días con menú" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {menus.map(m => {
              const activo = m.id === elegido?.id;
              return (
                <Link key={m.id} href={`/menu-del-dia?fecha=${m.fecha}`} className="md-chip" aria-current={activo ? "page" : undefined}
                  style={{ border: `1px solid ${activo ? AMR : BORDER}`, background: activo ? "#3a2f10" : SURFACE, color: activo ? AMR : TEXT1, borderRadius: 999, padding: "8px 16px", fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
                  {m.fecha === hoy ? "Hoy" : etiquetaDia(m.fecha).corta}
                </Link>
              );
            })}
          </nav>
        )}

        {elegido ? (
          <VistaMenu menu={elegido} esHoy={elegido.fecha === hoy} />
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "44px 28px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900 }}>Aún no publicamos el menú de hoy</div>
            <div style={{ fontSize: 16, color: TEXT3, maxWidth: 440, lineHeight: 1.6 }}>Vuelve más tarde, o mira nuestra carta mientras tanto.</div>
            <Link href="/carta" style={{ display: "inline-flex", background: AMR, color: "#1a1200", borderRadius: 12, padding: "13px 22px", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>Ver la carta</Link>
          </div>
        )}
      </main>
    </div>
  );
}
