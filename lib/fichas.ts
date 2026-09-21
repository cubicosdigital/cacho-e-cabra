export const AFPS = ["Capital", "Cuprum", "Habitat", "Modelo", "PlanVital", "ProVida", "Uno"];
export const ISAPRES = ["Banmédica", "Colmena", "Consalud", "Cruz Blanca", "Nueva Masvida", "Vida Tres", "Esencial", "Otra"];
export const BANCOS = ["Banco de Chile", "BancoEstado", "Santander", "BCI", "Scotiabank", "Itaú", "Banco Falabella", "Banco Ripley", "Banco Security", "Tenpo", "Mercado Pago", "Mach", "Otro"];
export const TIPOS_CUENTA = ["Cuenta RUT", "Cuenta corriente", "Cuenta vista", "Cuenta de ahorro"];
export const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Conviviente civil", "Separado/a", "Divorciado/a", "Viudo/a"];
export const PARENTESCOS = ["Madre", "Padre", "Pareja", "Hermano/a", "Hijo/a", "Amigo/a", "Otro"];

export interface Carga { nombre: string; rut: string; parentesco: string }

export interface Ficha {
  empleado_id: string;
  email: string | null; telefono: string | null; direccion: string | null; comuna: string | null;
  fecha_nacimiento: string | null; nacionalidad: string | null; estado_civil: string | null;
  emergencia_nombre: string | null; emergencia_parentesco: string | null; emergencia_telefono: string | null;
  afp: string | null; salud_sistema: "fonasa" | "isapre" | null; isapre_nombre: string | null; isapre_plan: string | null;
  seguro_cesantia: boolean | null; cargas: Carga[];
  visa_tipo: string | null; visa_vencimiento: string | null;
  banco: string | null; tipo_cuenta: string | null; numero_cuenta: string | null;
  manipulador_alimentos: boolean | null; manipulador_vencimiento: string | null;
  consentimiento: boolean; consentimiento_fecha: string | null;
  fecha_ingreso: string | null; contrato_duracion: "indefinido" | "plazo_fijo" | "por_obra" | null;
  fecha_termino: string | null; jornada_horas_semanales: number | null; sueldo_base: number | null;
  registrado_at: string | null;
}

export type EstadoTrabajador = "sin_invitar" | "invitado" | "vencida" | "registrado" | "completa";

export const ESTADO_LABEL: Record<EstadoTrabajador, string> = {
  sin_invitar: "Sin invitar", invitado: "Invitado", vencida: "Invitación vencida",
  registrado: "Falta completar contrato", completa: "Ficha completa",
};

/** Datos del contrato que llena el admin: si faltan, la ficha queda pendiente. */
export function contratoCompleto(f: Pick<Ficha, "fecha_ingreso" | "contrato_duracion" | "jornada_horas_semanales" | "sueldo_base"> | null | undefined) {
  return !!f && !!f.fecha_ingreso && !!f.contrato_duracion && f.jornada_horas_semanales != null && f.sueldo_base != null;
}

/** Rol de acceso al admin según el departamento donde trabaja. */
export const ROL_POR_DEPARTAMENTO: Record<string, "cocina" | "barra" | "mesero" | "coperia"> = {
  cocina: "cocina", coperia: "coperia", barra: "barra", garzones: "mesero",
};

/** Deja solo dígitos con código de país (Chile +56) para armar el link wa.me. */
export function normalizarTelefono(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 8) return `569${d}`;
  if (d.length === 9 && d.startsWith("9")) return `56${d}`;
  if (d.length === 11 && d.startsWith("56")) return d;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}
