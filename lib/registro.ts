import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

/** Cliente anónimo sin sesión persistente: sirve para enviar y verificar códigos por correo. */
export function supabaseAnonSinSesion() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Devuelve la invitación y el trabajador si el link sigue vigente y sin usar; si no, null. */
export async function cargarInvitacion(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const db = getSupabase();
  const { data: inv } = await db
    .from("invitaciones")
    .select("id, empleado_id, telefono, expira_en, usada_en, empleados(id, nombre, rut, cargo, departamento)")
    .eq("token", token)
    .maybeSingle();
  if (!inv || inv.usada_en || new Date(inv.expira_en) < new Date()) return null;
  const empleado = (Array.isArray(inv.empleados) ? inv.empleados[0] : inv.empleados) as
    { id: string; nombre: string; rut: string | null; cargo: string | null; departamento: string } | null;
  if (!empleado) return null;
  return { inv, empleado };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const texto = (v: unknown, max = 200) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s === "" ? null : s;
};
const fecha = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);

/** Toma solo los campos que el trabajador puede enviar y los limpia. */
export function sanearFicha(b: Record<string, unknown>) {
  const cargas = Array.isArray(b.cargas)
    ? b.cargas.slice(0, 10).map((c: Record<string, unknown>) => ({
        nombre: texto(c?.nombre, 120) ?? "", rut: texto(c?.rut, 20) ?? "", parentesco: texto(c?.parentesco, 40) ?? "",
      })).filter(c => c.nombre)
    : [];
  const salud = b.salud_sistema === "fonasa" || b.salud_sistema === "isapre" ? b.salud_sistema : null;

  return {
    telefono: texto(b.telefono, 30), direccion: texto(b.direccion, 200), comuna: texto(b.comuna, 80),
    fecha_nacimiento: fecha(b.fecha_nacimiento), nacionalidad: texto(b.nacionalidad, 60), estado_civil: texto(b.estado_civil, 40),
    emergencia_nombre: texto(b.emergencia_nombre, 120), emergencia_parentesco: texto(b.emergencia_parentesco, 40),
    emergencia_telefono: texto(b.emergencia_telefono, 30),
    afp: texto(b.afp, 40), salud_sistema: salud,
    isapre_nombre: salud === "isapre" ? texto(b.isapre_nombre, 60) : null,
    isapre_plan: salud === "isapre" ? texto(b.isapre_plan, 80) : null,
    seguro_cesantia: bool(b.seguro_cesantia), cargas,
    visa_tipo: texto(b.visa_tipo, 80), visa_vencimiento: fecha(b.visa_vencimiento),
    banco: texto(b.banco, 60), tipo_cuenta: texto(b.tipo_cuenta, 40), numero_cuenta: texto(b.numero_cuenta, 30),
    manipulador_alimentos: bool(b.manipulador_alimentos), manipulador_vencimiento: fecha(b.manipulador_vencimiento),
    consentimiento: b.consentimiento === true,
  };
}

export const OBLIGATORIOS: [keyof ReturnType<typeof sanearFicha>, string][] = [
  ["telefono", "el teléfono"], ["direccion", "la dirección"], ["comuna", "la comuna"],
  ["fecha_nacimiento", "la fecha de nacimiento"], ["nacionalidad", "la nacionalidad"], ["estado_civil", "el estado civil"],
  ["emergencia_nombre", "el nombre del contacto de emergencia"], ["emergencia_parentesco", "el parentesco del contacto de emergencia"],
  ["emergencia_telefono", "el teléfono del contacto de emergencia"],
];
