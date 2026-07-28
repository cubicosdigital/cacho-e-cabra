"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  Receipt, ListChecks, CalendarDays, UtensilsCrossed, Table2,
  CalendarClock, AlertTriangle, Inbox, MessageSquare, ChefHat, type LucideIcon,
} from "lucide-react";
import { SURFACE, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../lib/tokens";

export type Rol = "admin" | "mesero" | "cocina" | "barra" | "caja";

const TODOS: Rol[] = ["admin", "mesero", "cocina", "barra", "caja"];

const NAV: { href: string; label: string; icon: LucideIcon; roles: Rol[] }[] = [
  { href: "/admin/pedidos",         label: "Pedidos",     icon: Receipt,         roles: TODOS },
  { href: "/admin/tareas",          label: "Tareas",      icon: ListChecks,      roles: TODOS },
  { href: "/admin/mi-horario",      label: "Mi Horario",  icon: CalendarDays,    roles: TODOS },
  { href: "/admin/menu",            label: "Menú",        icon: UtensilsCrossed, roles: ["admin"] },
  { href: "/admin/sugerencias-chef", label: "Sugerencias Chef", icon: ChefHat,   roles: ["admin"] },
  { href: "/admin/mesas",           label: "Mesas",        icon: Table2,          roles: ["admin", "mesero"] },
  { href: "/admin/turnos",          label: "Turnos",      icon: CalendarClock,   roles: ["admin"] },
  { href: "/admin/denuncias/nueva", label: "Denunciar",   icon: AlertTriangle,   roles: TODOS },
  { href: "/admin/denuncias",       label: "Bandeja Denuncias", icon: Inbox,     roles: ["admin"] },
  { href: "/admin/reclamos",        label: "Reclamos",    icon: MessageSquare,   roles: ["admin"] },
];

const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador", mesero: "Mesero", cocina: "Cocina", barra: "Barra", caja: "Caja",
};

export default function Sidebar({ nombre, rol }: { nombre: string; rol: Rol }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const pathname = usePathname();
  const items = NAV.filter(n => n.roles.includes(rol));

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside style={{ width: 220, flexShrink: 0, background: "#242220", borderRight: `1px solid ${BORDER}`, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 6, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "0 6px" }}>
        <Image src="/LogoCachoEcabra.png" alt="Cacho Cabra" width={40} height={31} />
        <div style={{ fontFamily: TITLE, fontSize: 19, fontWeight: 900, color: TEXT1 }}>Cacho &amp; Cabra</div>
      </div>

      {items.map(n => {
        const active = pathname === n.href || (n.href !== "/admin/denuncias" && pathname.startsWith(n.href + "/"));
        const Icon = n.icon;
        return (
          <a key={n.href} href={n.href} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
            background: active ? AMR : "transparent", color: active ? "#1a1200" : TEXT2,
            fontFamily: FONT, fontSize: 18, fontWeight: active ? 700 : 500, textDecoration: "none",
          }}>
            <Icon size={18} strokeWidth={2} color={active ? "#1a1200" : TEXT2} />{n.label}
          </a>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ background: SURFACE, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: TEXT1 }}>{nombre}</div>
          <div style={{ fontSize: 16, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ROL_LABEL[rol]}</div>
        </div>
        <button onClick={logout} style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, color: TEXT3, borderRadius: 8, padding: "8px 0", fontSize: 17, cursor: "pointer", fontFamily: FONT }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
