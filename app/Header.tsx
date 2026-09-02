"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { BORDER, TEXT1, TEXT2, AMR, FONT, TITLE } from "../lib/tokens";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/carta", label: "Carta" },
  { href: "/eventos", label: "Eventos" },
  { href: "/#ubicacion", label: "Ubicación" },
];

export default function Header() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(current < lastScroll || current < 200);
      setLastScroll(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

  // Cierra el menú mobile al cambiar de página.
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/carta")) return null;

  // En el home el header flota sobre la foto del hero (sin ocupar espacio en el
  // documento), así la imagen llega de verdad hasta arriba, sin franja de fondo.
  const esHome = pathname === "/";

  return (
    <>
      <style>{`
        .header-links { display: flex; align-items: center; gap: 8px; }
        .header-burger { display: none; }
        .header-mobile-cta { display: none; }
        .header-logo-link { margin-left: -30px; }
        .header-logo { width: 224px; height: 179px; }
        @media (max-width: 760px) {
          .header-links { display: none; }
          .header-burger { display: flex; }
          .header-cta { display: none !important; }
          .header-mobile-cta { display: inline-flex; }
          .header-logo-link { margin-left: 0; }
          .header-logo { width: 108px; height: 86px; }
        }
      `}</style>

      <header style={{
        width: "100%",
        background: "transparent",
        position: esHome ? "absolute" : "relative",
        top: esHome ? 0 : undefined, left: esHome ? 0 : undefined, right: esHome ? 0 : undefined,
        zIndex: 30,
      }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "20px 20px 8px", width: "100%",
        display: "flex", alignItems: "center",
        minHeight: 60, gap: 28, flexWrap: "wrap",
      }}>
        <a href="/" className="header-logo-link" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flexShrink: 0 }}>
          <Image className="header-logo" src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={224} height={179} />
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
          <nav className="header-links">
            {LINKS.map(l => {
              const isActive = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <a key={l.href} href={l.href} style={{
                  fontFamily: FONT, fontSize: 15, fontWeight: isActive ? 900 : 700, color: isActive ? AMR : TEXT1,
                  textDecoration: "none", padding: "10px 16px", borderRadius: 10,
                  transition: "all 0.2s ease",
                }}>
                  {l.label}
                </a>
              );
            })}
          </nav>

          <a href="/carta" target="_blank" rel="noopener noreferrer" className="header-cta" style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: AMR, color: "#1a1200",
            borderRadius: 999, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", flexShrink: 0,
            transition: "all 0.2s ease", cursor: "pointer",
          }}>
            Ver la carta
          </a>

          <a href="/carta" target="_blank" rel="noopener noreferrer" className="header-mobile-cta" style={{
            alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0,
            background: AMR, color: "#1a1200", borderRadius: 999, padding: "8px 16px",
            fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Ver la carta
          </a>

          <button
            className="header-burger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            style={{
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              width: 44, height: 44, borderRadius: 10, border: `1px solid ${BORDER}`,
              background: "rgba(0,0,0,0.35)", color: TEXT1, cursor: "pointer",
            }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav style={{
          display: "flex", flexDirection: "column",
          background: "rgba(20,18,16,0.97)", borderTop: `1px solid ${BORDER}`,
          padding: "10px 20px 16px",
        }}>
          {LINKS.map(l => {
            const isActive = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <a key={l.href} href={l.href} style={{
                fontFamily: FONT, fontSize: 17, fontWeight: isActive ? 900 : 700, color: isActive ? AMR : TEXT1,
                textDecoration: "none", padding: "14px 8px", borderBottom: `1px solid ${BORDER}`,
              }}>
                {l.label}
              </a>
            );
          })}
        </nav>
      )}
      </header>
    </>
  );
}
