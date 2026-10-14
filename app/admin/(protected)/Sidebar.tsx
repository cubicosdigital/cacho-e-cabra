"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT } from "../../../lib/tokens";

import { ROL_LABEL, type Rol } from "../../../lib/roles";
import type { PermisosGuardados } from "../../../lib/permisos";
import { GRUPOS, visible, esActivo } from "./nav-config";
import { useAdminNav } from "./AdminNavProvider";
export type { Rol };

export default function Sidebar({ nombre, rol, permisos }: { nombre: string; rol: Rol; permisos: PermisosGuardados }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const { contadores } = useAdminNav();

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem("sidebar-scroll");
      if (guardado && asideRef.current) asideRef.current.scrollTop = Number(guardado);
    } catch { /* sin storage */ }
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside ref={asideRef} className="hidden md:flex" onScroll={e => { try { sessionStorage.setItem("sidebar-scroll", String(e.currentTarget.scrollTop)); } catch { /* sin storage */ } }}
      style={{ width: 216, flexShrink: 0, background: "#242220", borderRight: `1px solid ${BORDER}`, padding: "12px 8px", flexDirection: "column", gap: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      <div style={{ padding: "2px 6px 10px" }}>
        <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={188} height={66} style={{ width: "100%", height: "auto" }} priority />
      </div>

      {GRUPOS.map(grupo => {
        const items = grupo.items.filter(i => visible(i, rol, permisos));
        if (items.length === 0) return null;

        return (
          <div key={grupo.titulo} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 2px" }}>
              {grupo.titulo}
            </div>

            {items.map(item => {
              const Icon = item.icon;
              const badge = item.badge ? contadores[item.badge] : 0;

              if (item.pronto || !item.href) {
                return (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8,
                    color: TEXT3, fontFamily: FONT, fontSize: 15, fontWeight: 500, opacity: 0.55, cursor: "default",
                  }}>
                    <Icon size={15} strokeWidth={2} color={TEXT3} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, background: SURF2, color: TEXT3, borderRadius: 999, padding: "2px 7px" }}>pronto</span>
                  </div>
                );
              }

              const active = esActivo(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8,
                  background: active ? AMR : "transparent", color: active ? "#1a1200" : TEXT2,
                  fontFamily: FONT, fontSize: 15, fontWeight: active ? 700 : 500, textDecoration: "none",
                }}>
                  <Icon size={15} strokeWidth={2} color={active ? "#1a1200" : TEXT2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                  {badge > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 800, minWidth: 18, textAlign: "center",
                      background: active ? "#1a1200" : "#f05252", color: active ? AMR : "#fff",
                      borderRadius: 999, padding: "1px 6px",
                    }}>{badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ background: SURFACE, borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT1 }}>{nombre}</div>
          <div style={{ fontSize: 12, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ROL_LABEL[rol]}</div>
        </div>
        <button onClick={logout} style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, color: TEXT3, borderRadius: 8, padding: "5px 0", fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
