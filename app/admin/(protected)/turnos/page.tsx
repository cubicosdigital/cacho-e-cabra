"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, SURF2, FONT, TITLE } from "../../../../lib/tokens";

const DEPARTAMENTOS = ["cocina", "barra", "garzones", "coperia"] as const;
const TEMPORADA = "invierno-2026";

interface Empleado { id: string; nombre: string; departamento: string; tipo_contrato: string; activo: boolean }
interface Turno { id: string; empleado_id: string; horas: number }

export default function TurnosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [eRes, tRes] = await Promise.all([fetch("/api/empleados"), fetch("/api/turnos")]);
      if (eRes.ok) setEmpleados((await eRes.json() as Empleado[]).filter(e => e.activo));
      if (tRes.ok) setTurnos(await tRes.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Turnos de la semana</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{empleados.length} empleados · temporada {TEMPORADA} · edita el turno de cada persona desde su ficha</div>
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : DEPARTAMENTOS.map(depto => {
          const equipo = empleados.filter(e => e.departamento === depto);
          if (equipo.length === 0) return null;
          return (
            <div key={depto}>
              <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, textTransform: "capitalize", marginBottom: 10, color: AMR }}>{depto}</div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                {equipo.map((emp, idx) => {
                  const total = turnos.filter(t => t.empleado_id === emp.id).reduce((s, t) => s + t.horas, 0);
                  return (
                    <div key={emp.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 19 }}>{emp.nombre}</div>
                        <div style={{ fontSize: 16, color: TEXT3 }}>{emp.tipo_contrato === "part_time" ? "Part time" : "Full time"} · {total}h/semana</div>
                      </div>
                      <Link href={`/admin/trabajadores/${emp.id}?tab=turnos`} style={{ background: SURF2, color: TEXT1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 17, fontWeight: 700, textDecoration: "none" }}>
                        Ver/editar semana
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
