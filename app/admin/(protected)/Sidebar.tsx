"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Receipt, Bike, TrendingUp, FileText, Table2, UtensilsCrossed, ChefHat,
  AlertTriangle, Inbox, MessageSquare, CalendarClock, CalendarDays, Users,
  Image as ImageIcon, PartyPopper, ClipboardList, ListChecks, Megaphone, HandPlatter, Film, Fingerprint, Bell, Settings2, LayoutDashboard, SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT } from "../../../lib/tokens";

import { ROL_LABEL, type Rol } from "../../../lib/roles";
import { puede, type Accion, type Modulo, type PermisosGuardados } from "../../../lib/permisos";
export type { Rol };

type Item = {
  href?: string;
  label: string;
  icon: LucideIcon;
  /** "admin": solo administrador · "todos": cualquier usuario · [módulo, acción]: según sus permisos. */
  acceso: "admin" | "todos" | [Modulo, Accion];
  /** Módulo planificado, aún sin construir: se muestra apagado y sin link. */
  pronto?: boolean;
  /** Muestra un contador de pendientes junto al link. */
  badge?: "pedidosNuevos" | "deliveryNuevos" | "notificaciones";
};

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "General",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, acceso: "admin" },
      { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell, acceso: "admin", badge: "notificaciones" },
    ],
  },
  {
    titulo: "Ventas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos local", icon: Receipt, acceso: ["pedidos", "r"], badge: "pedidosNuevos" },
      { href: "/admin/delivery", label: "Pedidos delivery", icon: Bike, acceso: ["delivery", "r"], badge: "deliveryNuevos" },
      { href: "/admin/ventas", label: "Resumen de ventas", icon: TrendingUp, acceso: ["ventas", "r"] },
      { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText, acceso: ["presupuestos", "r"] },
    ],
  },
  {
    titulo: "Local",
    items: [
      { href: "/admin/mesas", label: "Mesas", icon: Table2, acceso: ["mesas", "r"] },
      { href: "/admin/menu", label: "Menú carta", icon: UtensilsCrossed, acceso: ["menu", "r"] },
      { href: "/admin/sugerencias-chef", label: "Sugerencias Chef", icon: ChefHat, acceso: ["menu", "r"] },
      { href: "/admin/denuncias/nueva", label: "Denunciar", icon: AlertTriangle, acceso: ["denuncias", "c"] },
      { href: "/admin/denuncias", label: "Bandeja de entrada", icon: Inbox, acceso: ["denuncias", "r"] },
      { href: "/admin/reclamos", label: "Reclamos", icon: MessageSquare, acceso: ["reclamos", "r"] },
    ],
  },
  {
    titulo: "Turnos",
    items: [
      { href: "/admin/trabajadores", label: "Trabajadores", icon: Users, acceso: ["trabajadores", "r"] },
      { href: "/admin/turnos", label: "Turnos de la semana", icon: CalendarClock, acceso: ["turnos", "u"] },
      { href: "/admin/mi-horario", label: "Mi horario", icon: CalendarDays, acceso: "todos" },
      { href: "/admin/asistencia", label: "Asistencia", icon: Fingerprint, acceso: ["asistencia", "r"] },
      { href: "/admin/terminal-zk", label: "Config. Terminal ZK", icon: Settings2, acceso: "admin" },
    ],
  },
  {
    titulo: "Contenido",
    items: [
      { href: "/admin/banner", label: "Banner principal", icon: ImageIcon, acceso: ["banner", "r"] },
      { href: "/admin/galeria", label: "Galería", icon: Film, acceso: ["galeria", "r"] },
      { href: "/admin/eventos", label: "Eventos", icon: PartyPopper, acceso: ["eventos", "r"] },
      { href: "/admin/invitados", label: "Invitados por evento", icon: ClipboardList, acceso: ["invitados", "r"] },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { href: "/admin/tareas", label: "Tareas Cacho Cabra", icon: ListChecks, acceso: ["tareas", "r"] },
      { label: "Tareas de marketing", icon: Megaphone, acceso: "admin", pronto: true },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { href: "/admin/configuracion", label: "Configuración", icon: SlidersHorizontal, acceso: "todos" },
    ],
  },
  {
    titulo: "Meseros",
    items: [
      { label: "Solicitudes de mesas", icon: HandPlatter, acceso: ["mesas", "r"], pronto: true },
    ],
  },
];


function visible(i: Item, rol: Rol, permisos: PermisosGuardados) {
  if (rol === "admin") return true;
  if (i.acceso === "admin") return false;
  if (i.acceso === "todos") return true;
  return puede(rol, permisos, i.acceso[0], i.acceso[1]);
}

export default function Sidebar({ nombre, rol, permisos }: { nombre: string; rol: Rol; permisos: PermisosGuardados }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const [contadores, setContadores] = useState({ pedidosNuevos: 0, deliveryNuevos: 0, notificaciones: 0 });

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem("sidebar-scroll");
      if (guardado && asideRef.current) asideRef.current.scrollTop = Number(guardado);
    } catch { /* sin storage */ }
  }, []);

  useEffect(() => {
    let vivo = true;
    async function contar() {
      try {
        const [rPedidos, rDelivery, rNotif] = await Promise.all([
          fetch("/api/pedidos"),
          fetch("/api/delivery"),
          rol === "admin" ? fetch("/api/notificaciones?contar=1") : Promise.resolve(null),
        ]);
        if (!vivo) return;
        const nuevos = (data: unknown) =>
          Array.isArray(data) ? data.filter((p: { estado: string }) => p.estado === "recibido").length : 0;
        setContadores({
          pedidosNuevos: rPedidos.ok ? nuevos(await rPedidos.json()) : 0,
          deliveryNuevos: rDelivery.ok ? nuevos(await rDelivery.json()) : 0,
          notificaciones: rNotif?.ok ? (await rNotif.json()).no_leidas ?? 0 : 0,
        });
      } catch {
        /* el contador es informativo: si falla, se queda como está */
      }
    }
    contar();
    const t = setInterval(contar, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [pathname, rol]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside ref={asideRef} onScroll={e => { try { sessionStorage.setItem("sidebar-scroll", String(e.currentTarget.scrollTop)); } catch { /* sin storage */ } }}
      style={{ width: 216, flexShrink: 0, background: "#242220", borderRight: `1px solid ${BORDER}`, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
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

              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
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
