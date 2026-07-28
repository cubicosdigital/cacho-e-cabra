/**
 * Corre una sola vez después de aplicar supabase/schema.sql (Fase 2):
 *   npx tsx scripts/seed-turnos.ts
 * Datos transcritos de extras/MALLA DE TURNO INVIERNO.xlsx (pestaña TURNOS).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { realtime: { transport: ws as never } });
const TEMPORADA = "invierno-2026";
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;

interface TurnoDia { entrada?: string; salida?: string; horas: number; nota?: string; }
interface EmpleadoSeed {
  nombre: string;
  departamento: "cocina" | "barra" | "garzones" | "coperia";
  tipo_contrato: "full_time" | "part_time";
  semana: Partial<Record<typeof DIAS[number], TurnoDia>>;
}

const EMPLEADOS: EmpleadoSeed[] = [
  // ── COCINA ──
  {
    nombre: "Gabriela", departamento: "cocina", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:00", horas: 7 },
      miercoles: { entrada: "16:30", salida: "00:00", horas: 7 },
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "10:30", salida: "01:00", horas: 14 },
      sabado: { entrada: "10:30", salida: "01:00", horas: 14 },
    },
  },
  {
    nombre: "Julian", departamento: "cocina", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:00", horas: 7 },
      miercoles: { entrada: "16:30", salida: "00:00", horas: 7 },
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "16:30", salida: "03:00", horas: 10 },
      sabado: { entrada: "16:30", salida: "03:00", horas: 10 },
    },
  },
  {
    nombre: "Fabi", departamento: "cocina", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:00", horas: 7 },
      miercoles: { entrada: "16:30", salida: "00:00", horas: 7 },
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "16:30", salida: "03:00", horas: 10 },
      sabado: { entrada: "16:30", salida: "03:00", horas: 10 },
    },
  },
  {
    nombre: "Carlos", departamento: "cocina", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:00", horas: 7 },
      miercoles: { entrada: "16:30", salida: "00:00", horas: 7 },
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "16:30", salida: "03:00", horas: 10 },
      sabado: { entrada: "16:30", salida: "03:00", horas: 10 },
    },
  },
  {
    nombre: "Andres", departamento: "cocina", tipo_contrato: "part_time",
    semana: {
      jueves: { entrada: "09:30", salida: "17:00", horas: 7 },
      viernes: { entrada: "10:30", salida: "17:00", horas: 6 },
      sabado: { entrada: "10:30", salida: "17:00", horas: 6 },
      domingo: { entrada: "11:30", salida: "23:00", horas: 11, nota: "Domingos trabajan 2 de cocina: Andrés + un rotativo. Quien lo acompañe libra el martes siguiente." },
    },
  },
  // ── BARRA ──
  {
    nombre: "Diego", departamento: "barra", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:00", horas: 7 },
      miercoles: { entrada: "16:30", salida: "00:00", horas: 7 },
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "12:00", salida: "01:00", horas: 12.5 },
      sabado: { entrada: "19:00", salida: "03:00", horas: 7.5 },
    },
  },
  {
    nombre: "Seba", departamento: "barra", tipo_contrato: "full_time",
    semana: {
      jueves: { entrada: "16:30", salida: "02:00", horas: 9 },
      viernes: { entrada: "16:30", salida: "03:00", horas: 10 },
      sabado: { entrada: "12:00", salida: "01:00", horas: 12.5 },
      domingo: { entrada: "13:00", salida: "00:00", horas: 10.5 },
    },
  },
  // ── GARZONES ──
  {
    nombre: "David", departamento: "garzones", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "16:30", salida: "00:30", horas: 7.5 },
      miercoles: { entrada: "18:00", salida: "00:30", horas: 6 },
      jueves: { entrada: "16:30", salida: "02:30", horas: 9.5 },
      viernes: { entrada: "16:30", salida: "03:30", horas: 10.5 },
      sabado: { entrada: "18:30", salida: "03:30", horas: 8.5 },
    },
  },
  {
    nombre: "Nicolas", departamento: "garzones", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "18:00", salida: "00:30", horas: 6 },
      miercoles: { entrada: "16:30", salida: "00:30", horas: 7.5 },
      jueves: { entrada: "16:30", salida: "02:30", horas: 9.5 },
      viernes: { entrada: "18:30", salida: "03:30", horas: 8.5 },
      sabado: { entrada: "16:30", salida: "03:30", horas: 10.5 },
    },
  },
  {
    nombre: "Luisa", departamento: "garzones", tipo_contrato: "part_time",
    semana: {
      viernes: { entrada: "16:30", salida: "03:30", horas: 10.5, nota: "Ese día también entra 10:30 AM aparte; ese turno extra no está incluido en las 30 hrs." },
      sabado: { entrada: "19:00", salida: "03:30", horas: 8 },
      domingo: { entrada: "12:00", salida: "00:00", horas: 11.5 },
    },
  },
  {
    nombre: "Tomas", departamento: "garzones", tipo_contrato: "part_time",
    semana: {
      viernes: { entrada: "19:00", salida: "03:30", horas: 8 },
      sabado: { entrada: "16:30", salida: "03:30", horas: 10.5, nota: "Ese día también entra 10:30 AM aparte; ese turno extra no está incluido en las 30 hrs." },
      domingo: { entrada: "12:00", salida: "00:00", horas: 11.5 },
    },
  },
  {
    nombre: "Cristian", departamento: "garzones", tipo_contrato: "part_time",
    semana: {
      miercoles: { entrada: "16:30", salida: "00:30", horas: 7.5 },
      jueves: { entrada: "18:30", salida: "02:30", horas: 7.5 },
      viernes: { entrada: "19:30", salida: "03:30", horas: 7.5, nota: "Su horario real de ingreso viernes/sábado es 10:30 hrs (acordado personalmente)." },
      sabado: { entrada: "19:30", salida: "03:30", horas: 7.5, nota: "Su horario real de ingreso viernes/sábado es 10:30 hrs (acordado personalmente)." },
    },
  },
  // ── COPERÍA ──
  {
    nombre: "Willy", departamento: "coperia", tipo_contrato: "full_time",
    semana: {
      martes: { entrada: "19:30", salida: "00:30", horas: 4.5 },
      miercoles: { entrada: "19:30", salida: "00:30", horas: 4.5 },
      jueves: { entrada: "19:30", salida: "02:30", horas: 6.5 },
      viernes: { entrada: "18:30", salida: "03:30", horas: 8.5 },
      sabado: { entrada: "18:30", salida: "03:30", horas: 8.5 },
      domingo: { entrada: "14:00", salida: "00:00", horas: 9.5 },
    },
  },
  {
    nombre: "Maria", departamento: "coperia", tipo_contrato: "part_time",
    semana: {
      martes: { entrada: "13:00", salida: "19:30", horas: 6 },
      miercoles: { entrada: "13:00", salida: "19:30", horas: 6 },
      jueves: { entrada: "13:00", salida: "19:30", horas: 6 },
      viernes: { entrada: "12:00", salida: "18:30", horas: 6 },
      sabado: { entrada: "12:00", salida: "18:30", horas: 6 },
    },
  },
];

async function main() {
  for (const emp of EMPLEADOS) {
    const { data: empleado, error: errEmp } = await supabase
      .from("empleados")
      .insert({ nombre: emp.nombre, departamento: emp.departamento, tipo_contrato: emp.tipo_contrato })
      .select()
      .single();

    if (errEmp) { console.error(`Error creando ${emp.nombre}:`, errEmp.message); continue; }

    const filas = DIAS.map(dia => {
      const t = emp.semana[dia];
      return {
        empleado_id: empleado.id,
        temporada: TEMPORADA,
        dia_semana: dia,
        hora_entrada: t?.entrada ?? null,
        hora_salida: t?.salida ?? null,
        horas: t?.horas ?? 0,
        nota: t?.nota ?? null,
      };
    });

    const { error: errTurnos } = await supabase.from("turnos").insert(filas);
    if (errTurnos) console.error(`Error creando turnos de ${emp.nombre}:`, errTurnos.message);
    else console.log(`✓ ${emp.nombre} (${emp.departamento}) — 7 turnos`);
  }

  console.log(`\nListo: ${EMPLEADOS.length} empleados cargados en temporada "${TEMPORADA}".`);
}

main();
