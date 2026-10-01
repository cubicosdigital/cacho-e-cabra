export type Rol = "admin" | "supervisor" | "mesero" | "runner" | "barra" | "coperia" | "cocina" | "caja" | "recepcionista";

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador", supervisor: "Supervisor", mesero: "Garzón", runner: "Runner", barra: "Bartender",
  coperia: "Coperia", cocina: "Cocinero", caja: "Caja", recepcionista: "Recepcionista",
};

/** Roles que el administrador puede asignar al crear usuarios. */
export const ROLES_CREABLES: Rol[] = ["admin", "supervisor", "mesero", "runner", "barra", "cocina", "coperia", "recepcionista"];

export const TODOS_LOS_ROLES: Rol[] = ["admin", "supervisor", "mesero", "runner", "barra", "coperia", "cocina", "caja", "recepcionista"];
