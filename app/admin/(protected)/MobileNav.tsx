"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../lib/tokens";
import { GRUPOS, tabsPara, visible, esActivo } from "./nav-config";
import { useAdminNav } from "./AdminNavProvider";

const RUTA_MENU = "/admin/menu-app";

export default function MobileNav() {
  const { nombre, rol, permisos, contadores } = useAdminNav();
  const pathname = usePathname();

  const tabs = tabsPara(rol, permisos);
  const enTabs = new Set(tabs.map(t => t.href));
  const itemsVisibles = GRUPOS.flatMap(g => g.items).filter(i => i.href && !i.pronto && visible(i, rol, permisos));
  const actual = itemsVisibles
    .filter(i => esActivo(pathname, i.href!))
    .sort((a, b) => b.href!.length - a.href!.length)[0];

  const enMenu = pathname === RUTA_MENU;
  const menuActivo = enMenu || !tabs.some(t => esActivo(pathname, t.href!));
  const pendientesMenu = itemsVisibles
    .filter(i => i.badge && !enTabs.has(i.href))
    .reduce((n, i) => n + contadores[i.badge!], 0);
  const titulo = enMenu ? "Menú" : actual?.label ?? "Cacho Cabra";
  const inicial = (nombre.trim()[0] ?? "?").toUpperCase();

  return (
    <>
      <header className="flex md:hidden" style={{
        position: "sticky", top: 0, zIndex: 40, height: 52, alignItems: "center", gap: 12,
        padding: "0 14px", background: "#242220", borderBottom: `1px solid ${BORDER}`,
      }}>
        <Link href="/admin" aria-label="Inicio" style={{ display: "flex", flexShrink: 0 }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={64} height={22} style={{ height: "auto", width: 64 }} priority />
        </Link>
        <div style={{ flex: 1, minWidth: 0, fontFamily: TITLE, fontSize: 17, fontWeight: 800, color: TEXT1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {titulo}
        </div>
        <Link href={RUTA_MENU} aria-label="Menú" style={{
          width: 32, height: 32, borderRadius: "50%", background: "#433f3a", color: TEXT1, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>{inicial}</Link>
      </header>

      <nav className="flex md:hidden" aria-label="Navegación principal" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: "#242220", borderTop: `1px solid ${BORDER}`, paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const activo = !enMenu && esActivo(pathname, t.href!);
          const badge = t.badge ? contadores[t.badge] : 0;
          return (
            <Tab key={t.href} href={t.href!} label={t.corto ?? t.label} activo={activo} badge={badge}>
              <Icon size={22} strokeWidth={2} color={activo ? AMR : TEXT3} />
            </Tab>
          );
        })}
        <Tab href={RUTA_MENU} label="Menú" activo={menuActivo} badge={pendientesMenu}>
          <Menu size={22} strokeWidth={2} color={menuActivo ? AMR : TEXT3} />
        </Tab>
      </nav>
    </>
  );
}

function Tab({ href, label, activo, badge, children }: {
  href: string; label: string; activo: boolean; badge: number; children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={activo ? "page" : undefined} style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "9px 4px 10px", textDecoration: "none", position: "relative",
    }}>
      <span style={{ position: "relative", display: "flex" }}>
        {children}
        {badge > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -10, fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: "center",
            background: "#f05252", color: "#fff", borderRadius: 999, padding: "1px 5px", fontFamily: FONT,
          }}>{badge}</span>
        )}
      </span>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: activo ? 700 : 500, color: activo ? AMR : TEXT3,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
      }}>{label}</span>
    </Link>
  );
}
