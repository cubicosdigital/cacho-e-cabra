export type Rol = "admin" | "supervisor" | "mesero" | "barra" | "coperia" | "cocina" | "caja";

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador", supervisor: "Supervisor", mesero: "Garzón", barra: "Barman", coperia: "Coperia", cocina: "Cocina", caja: "Caja",
};

/** Roles que el administrador puede asignar al crear usuarios. */
export const ROLES_CREABLES: Rol[] = ["admin", "supervisor", "mesero", "barra", "coperia"];

export const TODOS_LOS_ROLES: Rol[] = ["admin", "supervisor", "mesero", "barra", "coperia", "cocina", "caja"];
