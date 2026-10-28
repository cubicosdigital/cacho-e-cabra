import {
  Receipt, Bike, TrendingUp, FileText, Table2, UtensilsCrossed, ChefHat,
  AlertTriangle, Inbox, MessageSquare, CalendarClock, CalendarDays, Users,
  Image as ImageIcon, PartyPopper, ClipboardList, ListChecks, Megaphone, HandPlatter, Film, Fingerprint, Bell, Settings2, LayoutDashboard, SlidersHorizontal, CreditCard, Briefcase, Gift,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "../../../lib/roles";
import { puede, type Accion, type Modulo, type PermisosGuardados } from "../../../lib/permisos";

export type Badge = "pedidosNuevos" | "deliveryNuevos" | "notificaciones";

export type Item = {
  href?: string;
  label: string;
  /** Nombre corto para la barra de pestañas del móvil. */
  corto?: string;
  icon: LucideIcon;
  /** "admin": solo administrador · "todos": cualquier usuario · [módulo, acción]: según sus permisos. */
  acceso: "admin" | "todos" | [Modulo, Accion];
  /** Módulo planificado, aún sin construir: se muestra apagado y sin link. */
  pronto?: boolean;
  /** Muestra un contador de pendientes junto al link. */
  badge?: Badge;
};

export const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "General",
    items: [
      { href: "/admin", label: "Dashboard", corto: "Inicio", icon: LayoutDashboard, acceso: "admin" },
      { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell, acceso: "admin", badge: "notificaciones" },
    ],
  },
  {
    titulo: "Ventas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos local", corto: "Pedidos", icon: Receipt, acceso: ["pedidos", "r"], badge: "pedidosNuevos" },
      { href: "/admin/delivery", label: "Pedidos delivery", corto: "Delivery", icon: Bike, acceso: ["delivery", "r"], badge: "deliveryNuevos" },
      { href: "/admin/pos", label: "POS (Caja)", corto: "Caja", icon: CreditCard, acceso: ["pos", "r"] },
      { href: "/admin/ventas", label: "Resumen de ventas", corto: "Ventas", icon: TrendingUp, acceso: ["ventas", "r"] },
      { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText, acceso: ["presupuestos", "r"] },
      { href: "/admin/giftcards", label: "Gift cards", icon: Gift, acceso: ["giftcards", "r"] },
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
      { href: "/admin/postulaciones", label: "Postulaciones", icon: Briefcase, acceso: ["postulaciones", "r"] },
      { href: "/admin/turnos", label: "Malla de turnos", icon: CalendarClock, acceso: ["turnos", "u"] },
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

export function visible(i: Item, rol: Rol, permisos: PermisosGuardados) {
  if (rol === "admin") return true;
  if (i.acceso === "admin") return false;
  if (permisos.sin_turnos && (i.href === "/admin/mi-horario" || i.href === "/admin/turnos")) return false;
  if (i.acceso === "todos") return true;
  return puede(rol, permisos, i.acceso[0], i.acceso[1]);
}

export function esActivo(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
}

const TABS_POR_ROL: Partial<Record<Rol, string[]>> = {
  admin: ["/admin", "/admin/pedidos", "/admin/ventas"],
  caja: ["/admin/pos", "/admin/pedidos", "/admin/mi-horario"],
  cocina: ["/admin/pedidos", "/admin/mi-horario"],
  barra: ["/admin/pedidos", "/admin/mi-horario"],
  coperia: ["/admin/pedidos", "/admin/mi-horario"],
};
const TABS_POR_DEFECTO = ["/admin/pedidos", "/admin/mesas", "/admin/mi-horario"];
const TABS_RELLENO = ["/admin/pedidos", "/admin/mesas", "/admin/mi-horario", "/admin/delivery", "/admin/pos"];

/** Los 3 accesos fijos de la barra inferior, según el rol y lo que la persona puede ver. */
export function tabsPara(rol: Rol, permisos: PermisosGuardados): Item[] {
  const todos = GRUPOS.flatMap(g => g.items).filter(i => i.href && !i.pronto && visible(i, rol, permisos));
  const porHref = new Map(todos.map(i => [i.href!, i]));
  const elegidos: Item[] = [];
  for (const href of [...(TABS_POR_ROL[rol] ?? TABS_POR_DEFECTO), ...TABS_RELLENO]) {
    const item = porHref.get(href);
    if (item && !elegidos.includes(item)) elegidos.push(item);
    if (elegidos.length === 3) break;
  }
  return elegidos;
}
