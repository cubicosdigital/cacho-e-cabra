"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Receipt, Bike, TrendingUp, FileText, Table2, UtensilsCrossed, ChefHat,
  AlertTriangle, Inbox, MessageSquare, CalendarClock, CalendarDays, Users,
  Image as ImageIcon, PartyPopper, ClipboardList, ListChecks, Megaphone, HandPlatter,
  type LucideIcon,
} from "lucide-react";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT } from "../../../lib/tokens";

export type Rol = "admin" | "mesero" | "cocina" | "barra" | "caja";

const TODOS: Rol[] = ["admin", "mesero", "cocina", "barra", "caja"];

type Item = {
  href?: string;
  label: string;
  icon: LucideIcon;
  roles: Rol[];
  /** Módulo planificado, aún sin construir: se muestra apagado y sin link. */
  pronto?: boolean;
  /** Muestra un contador de pendientes junto al link. */
  badge?: "pedidosNuevos" | "deliveryNuevos";
};

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "Ventas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos local", icon: Receipt, roles: TODOS, badge: "pedidosNuevos" },
      { href: "/admin/delivery", label: "Pedidos delivery", icon: Bike, roles: TODOS, badge: "deliveryNuevos" },
      { href: "/admin/ventas", label: "Resumen de ventas", icon: TrendingUp, roles: ["admin", "caja"] },
      { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText, roles: ["admin"] },
    ],
  },
  {
    titulo: "Local",
    items: [
      { href: "/admin/mesas", label: "Mesas", icon: Table2, roles: ["admin", "mesero"] },
      { href: "/admin/menu", label: "Menú carta", icon: UtensilsCrossed, roles: ["admin"] },
      { href: "/admin/sugerencias-chef", label: "Sugerencias Chef", icon: ChefHat, roles: ["admin"] },
      { href: "/admin/denuncias/nueva", label: "Denunciar", icon: AlertTriangle, roles: TODOS },
      { href: "/admin/denuncias", label: "Bandeja de entrada", icon: Inbox, roles: ["admin"] },
      { href: "/admin/reclamos", label: "Reclamos", icon: MessageSquare, roles: ["admin"] },
    ],
  },
  {
    titulo: "Turnos",
    items: [
      { href: "/admin/turnos", label: "Turnos de la semana", icon: CalendarClock, roles: ["admin"] },
      { href: "/admin/mi-horario", label: "Mi horario", icon: CalendarDays, roles: TODOS },
      { label: "Trabajadores", icon: Users, roles: ["admin"], pronto: true },
    ],
  },
  {
    titulo: "Contenido",
    items: [
      { href: "/admin/banner", label: "Banner principal", icon: ImageIcon, roles: ["admin"] },
      { href: "/admin/eventos", label: "Eventos", icon: PartyPopper, roles: ["admin"] },
      { href: "/admin/invitados", label: "Invitados por evento", icon: ClipboardList, roles: ["admin"] },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { href: "/admin/tareas", label: "Tareas Cacho Cabra", icon: ListChecks, roles: TODOS },
      { label: "Tareas de marketing", icon: Megaphone, roles: ["admin"], pronto: true },
    ],
  },
  {
    titulo: "Meseros",
    items: [
      { label: "Solicitudes de mesas", icon: HandPlatter, roles: ["admin", "mesero"], pronto: true },
    ],
  },
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
  const [contadores, setContadores] = useState({ pedidosNuevos: 0, deliveryNuevos: 0 });

  useEffect(() => {
    let vivo = true;
    async function contar() {
      try {
        const [rPedidos, rDelivery] = await Promise.all([
          fetch("/api/pedidos"),
          fetch("/api/delivery"),
        ]);
        if (!vivo) return;
        const nuevos = (data: unknown) =>
          Array.isArray(data) ? data.filter((p: { estado: string }) => p.estado === "recibido").length : 0;
        setContadores({
          pedidosNuevos: rPedidos.ok ? nuevos(await rPedidos.json()) : 0,
          deliveryNuevos: rDelivery.ok ? nuevos(await rDelivery.json()) : 0,
        });
      } catch {
        /* el contador es informativo: si falla, se queda como está */
      }
    }
    contar();
    const t = setInterval(contar, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside style={{ width: 232, flexShrink: 0, background: "#242220", borderRight: `1px solid ${BORDER}`, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4, minHeight: "100vh" }}>
      <div style={{ padding: "4px 6px 22px" }}>
        <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={188} height={66} style={{ width: "100%", height: "auto" }} priority />
      </div>

      {GRUPOS.map(grupo => {
        const items = grupo.items.filter(i => i.roles.includes(rol));
        if (items.length === 0) return null;

        return (
          <div key={grupo.titulo} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px 4px" }}>
              {grupo.titulo}
            </div>

            {items.map(item => {
              const Icon = item.icon;
              const badge = item.badge ? contadores[item.badge] : 0;

              if (item.pronto || !item.href) {
                return (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                    color: TEXT3, fontFamily: FONT, fontSize: 17, fontWeight: 500, opacity: 0.55, cursor: "default",
                  }}>
                    <Icon size={17} strokeWidth={2} color={TEXT3} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, background: SURF2, color: TEXT3, borderRadius: 999, padding: "2px 7px" }}>pronto</span>
                  </div>
                );
              }

              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <a key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                  background: active ? AMR : "transparent", color: active ? "#1a1200" : TEXT2,
                  fontFamily: FONT, fontSize: 17, fontWeight: active ? 700 : 500, textDecoration: "none",
                }}>
                  <Icon size={17} strokeWidth={2} color={active ? "#1a1200" : TEXT2} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge > 0 && (
                    <span style={{
                      fontSize: 12, fontWeight: 800, minWidth: 20, textAlign: "center",
                      background: active ? "#1a1200" : "#f05252", color: active ? AMR : "#fff",
                      borderRadius: 999, padding: "1px 6px",
                    }}>{badge}</span>
                  )}
                </a>
              );
            })}
          </div>
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
