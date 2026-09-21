import type { Rol } from "./roles";

export type Accion = "c" | "r" | "u" | "d";
export const ACCIONES: { k: Accion; label: string }[] = [
  { k: "c", label: "Crear" }, { k: "r", label: "Ver" }, { k: "u", label: "Editar" }, { k: "d", label: "Borrar" },
];

/** Módulos cuyos permisos se pueden repartir. Dashboard, Terminal ZK, Usuarios y Notificaciones son solo del administrador. */
export const MODULOS = [
  { k: "pedidos", label: "Pedidos del local", grupo: "Ventas" },
  { k: "delivery", label: "Pedidos delivery", grupo: "Ventas" },
  { k: "ventas", label: "Resumen de ventas", grupo: "Ventas", solo: ["r"] },
  { k: "presupuestos", label: "Presupuestos", grupo: "Ventas" },
  { k: "pos", label: "POS en caja (cobros)", grupo: "Ventas" },
  { k: "mesas", label: "Mesas", grupo: "Local" },
  { k: "menu", label: "Menú carta y sugerencias del chef", grupo: "Local" },
  { k: "reclamos", label: "Reclamos de clientes", grupo: "Local", solo: ["r", "u"] },
  { k: "denuncias", label: "Denuncias (bandeja)", grupo: "Local", solo: ["c", "r", "u"] },
  { k: "turnos", label: "Turnos de la semana", grupo: "Personas" },
  { k: "asistencia", label: "Asistencia", grupo: "Personas" },
  { k: "trabajadores", label: "Trabajadores y fichas", grupo: "Personas" },
  { k: "banner", label: "Banner principal", grupo: "Contenido" },
  { k: "galeria", label: "Galería", grupo: "Contenido" },
  { k: "eventos", label: "Eventos", grupo: "Contenido" },
  { k: "invitados", label: "Invitados por evento", grupo: "Contenido", solo: ["r", "u", "d"] },
  { k: "tareas", label: "Tareas", grupo: "Operaciones" },
] as const satisfies readonly { k: string; label: string; grupo: string; solo?: readonly Accion[] }[];

export type Modulo = (typeof MODULOS)[number]["k"];
export type Permisos = Partial<Record<Modulo, Accion[]>>;

export function accionesDe(modulo: Modulo): Accion[] {
  const m = MODULOS.find(x => x.k === modulo) as { solo?: readonly Accion[] } | undefined;
  return m?.solo ? [...m.solo] : ["c", "r", "u", "d"];
}

const TODO: Accion[] = ["c", "r", "u", "d"];
const basicoStaff: Permisos = { pedidos: ["r", "u"], delivery: ["r", "u"], tareas: ["r", "u"], turnos: ["r"], denuncias: ["c"] };

/** Lo que puede hacer cada rol si el administrador no le cambia nada. */
export const PERMISOS_POR_ROL: Record<Rol, Permisos> = {
  admin: Object.fromEntries(MODULOS.map(m => [m.k, accionesDe(m.k)])) as Permisos,
  supervisor: {
    pedidos: ["c", "r", "u"], delivery: TODO, pos: ["c", "r", "u"], mesas: ["r", "u"], menu: TODO, banner: TODO, galeria: TODO, eventos: TODO,
    invitados: ["r", "u"], tareas: TODO, turnos: ["r"], denuncias: ["c"],
  },
  mesero: { ...basicoStaff, pedidos: ["c", "r", "u"], mesas: ["r"] },
  barra: { ...basicoStaff },
  coperia: { ...basicoStaff },
  cocina: { ...basicoStaff },
  caja: { ...basicoStaff, ventas: ["r"], pos: ["c", "r", "u"] },
};

/** Guardado en usuarios_admin.permisos: { modulos: { galeria: ["r","u"] }, pos?: boolean }. */
export interface PermisosGuardados { modulos?: Permisos; pos?: boolean }

export function permisosEfectivos(rol: Rol, guardados: PermisosGuardados | null | undefined): Permisos {
  if (rol === "admin") return PERMISOS_POR_ROL.admin;
  return guardados?.modulos ?? PERMISOS_POR_ROL[rol] ?? {};
}

export function puede(rol: Rol, guardados: PermisosGuardados | null | undefined, modulo: Modulo, accion: Accion) {
  return permisosEfectivos(rol, guardados)[modulo]?.includes(accion) ?? false;
}

/** Quita lo que no corresponde (módulos inexistentes, acciones que el módulo no tiene). */
export function sanearPermisos(entrada: unknown): Permisos {
  const out: Permisos = {};
  if (!entrada || typeof entrada !== "object") return out;
  for (const m of MODULOS) {
    const v = (entrada as Record<string, unknown>)[m.k];
    if (!Array.isArray(v)) continue;
    const validas = accionesDe(m.k);
    const acc = TODO.filter(a => v.includes(a) && validas.includes(a));
    if (acc.length) out[m.k] = acc;
  }
  return out;
}
