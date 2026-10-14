"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";
import { ROL_LABEL } from "../../../../lib/roles";
import { GRUPOS, visible } from "../nav-config";
import { useAdminNav } from "../AdminNavProvider";

export default function MenuAppPage() {
  const { nombre, rol, permisos, contadores } = useAdminNav();
  const router = useRouter();

  async function logout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const grupos = GRUPOS
    .map(g => ({ titulo: g.titulo, items: g.items.filter(i => i.href && !i.pronto && visible(i, rol, permisos)) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ minHeight: "100%", background: BG, fontFamily: FONT, color: TEXT1, padding: "20px 16px 28px" }}>
      <style>{`
        .menu-app-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        @media (min-width: 520px) { .menu-app-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 768px) { .menu-app-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900 }}>Menú</div>
          <div style={{ fontSize: 15, color: TEXT3 }}>{nombre} · {ROL_LABEL[rol]}</div>
        </div>

        {grupos.map(grupo => (
          <section key={grupo.titulo}>
            <div style={{ fontSize: 12, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              {grupo.titulo}
            </div>
            <div className="menu-app-grid">
              {grupo.items.map(item => {
                const Icon = item.icon;
                const badge = item.badge ? contadores[item.badge] : 0;
                return (
                  <Link key={item.href} href={item.href!} style={{
                    position: "relative", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
                    padding: "16px 10px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                    textDecoration: "none", color: TEXT1, minHeight: 104, justifyContent: "center",
                  }}>
                    <span style={{
                      width: 46, height: 46, borderRadius: 13, background: "rgba(251,191,36,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={24} strokeWidth={2} color={AMR} />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, textAlign: "center", lineHeight: 1.25 }}>{item.label}</span>
                    {badge > 0 && (
                      <span style={{
                        position: "absolute", top: 8, right: 10, fontSize: 11, fontWeight: 800, minWidth: 20, textAlign: "center",
                        background: "#f05252", color: "#fff", borderRadius: 999, padding: "1px 6px",
                      }}>{badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <button onClick={logout} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
          background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 0",
          color: "#F09595", fontFamily: FONT, fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          <LogOut size={17} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
