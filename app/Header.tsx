"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { BORDER, TEXT1, TEXT2, AMR, FONT, TITLE } from "../lib/tokens";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/carta", label: "Carta" },
  { href: "/#ubicacion", label: "Ubicación" },
];

export default function Header() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(current < lastScroll || current < 200);
      setLastScroll(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/carta")) return null;

  return (
    <>
      <header style={{
        width: "100%",
        background: "transparent",
        position: "relative", zIndex: 10,
      }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "20px 20px 8px", width: "100%",
        display: "flex", alignItems: "center",
        minHeight: 60, gap: 28, flexWrap: "wrap",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flexShrink: 0, marginLeft: "-30px" }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={224} height={179} />
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {LINKS.map(l => (
              <a key={l.href} href={l.href} style={{
                fontFamily: FONT, fontSize: 15, fontWeight: 700, color: TEXT1,
                textDecoration: "none", padding: "10px 16px", borderRadius: 10,
                transition: "all 0.2s ease",
              }}>
                {l.label}
              </a>
            ))}
          </nav>

          <a href="/carta" style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: AMR, color: "#1a1200",
            borderRadius: 999, padding: "12px 28px", fontSize: 15, fontWeight: 800, textDecoration: "none", flexShrink: 0,
            transition: "all 0.2s ease", cursor: "pointer",
          }}>
            Ver la carta
          </a>
        </div>
      </div>
      </header>
    </>
  );
}
