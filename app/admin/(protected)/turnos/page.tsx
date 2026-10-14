"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../lib/tokens";

const DEPARTAMENTOS = ["cocina", "barra", "garzones", "coperia"] as const;
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
const DIA_LABEL: Record<string, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };
const TEMPORADA = "invierno-2026";

interface Empleado { id: string; nombre: string; departamento: string; tipo_contrato: string; activo: boolean; jornada_tipo?: "ordinaria" | "art22" }
interface Turno { id: string; empleado_id: string; dia_semana: string; hora_entrada: string | null; hora_salida: string | null; horas: number; nota: string | null }

const hhmm = (h: string | null) => (h ? h.slice(0, 5) : "");
const fmtH = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export default function TurnosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [eRes, tRes] = await Promise.all([fetch("/api/empleados"), fetch("/api/turnos")]);
      if (eRes.ok) setEmpleados((await eRes.json() as Empleado[]).filter(e => e.activo && e.jornada_tipo !== "art22"));
      if (tRes.ok) setTurnos(await tRes.json());
      setLoading(false);
    })();
  }, []);

  const celda = (empId: string, dia: string) => turnos.find(t => t.empleado_id === empId && t.dia_semana === dia);
  const trabaja = (t?: Turno) => !!t && (!!t.hora_entrada || t.horas > 0);

  const th: React.CSSProperties = { padding: "10px 12px", fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` };

  return (
    <div className="adm-page" style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div className="adm-h1" style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Malla de turnos</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {empleados.length} personas · temporada {TEMPORADA} · haz clic en una persona para editar sus turnos. Horas ya descuentan la colación.
          </div>
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : DEPARTAMENTOS.map(depto => {
          const equipo = empleados.filter(e => e.departamento === depto);
          if (equipo.length === 0) return null;
          return (
            <div key={depto}>
              <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, textTransform: "capitalize", marginBottom: 10, color: AMR }}>{depto}</div>
              <div className="adm-table-wrap" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: SURFACE, minWidth: 190 }}>Persona</th>
                      {DIAS.map(d => <th key={d} style={th}>{DIA_LABEL[d]}</th>)}
                      <th style={th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipo.map(emp => {
                      const meta = emp.tipo_contrato === "part_time" ? 30 : 42;
                      const total = DIAS.reduce((s, d) => s + (celda(emp.id, d)?.horas ?? 0), 0);
                      const colorTotal = total === 0 ? TEXT3 : total === meta ? VERDE : total > meta ? ROJO : AMR;
                      return (
                        <tr key={emp.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "10px 12px", position: "sticky", left: 0, background: SURFACE }}>
                            <Link href={`/admin/trabajadores/${emp.id}?tab=turnos`} style={{ color: TEXT1, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>{emp.nombre}</Link>
                            <div style={{ fontSize: 13, color: TEXT3 }}>{emp.tipo_contrato === "part_time" ? "Part time" : "Full time"}</div>
                          </td>
                          {DIAS.map(d => {
                            const t = celda(emp.id, d);
                            return (
                              <td key={d} title={t?.nota ?? ""} style={{ padding: "8px 6px", textAlign: "center", fontSize: 15, whiteSpace: "nowrap" }}>
                                {trabaja(t) ? (
                                  <div style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px" }}>
                                    <div style={{ color: TEXT1, fontWeight: 700 }}>{hhmm(t!.hora_entrada) || "—"} – {hhmm(t!.hora_salida) || "—"}</div>
                                    <div style={{ color: TEXT2, fontSize: 13 }}>{fmtH(t!.horas)} h{t!.nota ? " · nota" : ""}</div>
                                  </div>
                                ) : <span style={{ color: TEXT3, fontSize: 13, fontWeight: 700 }}>LIBRE</span>}
                              </td>
                            );
                          })}
                          <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, color: colorTotal }}>{fmtH(total)} h</div>
                            <div style={{ fontSize: 12, color: TEXT3 }}>de {meta} h</div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: `1px solid ${BORDER}`, background: SURF2 }}>
                      <td style={{ padding: "8px 12px", position: "sticky", left: 0, background: SURF2, fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase" }}>Personas ese día</td>
                      {DIAS.map(d => {
                        const n = equipo.filter(e => trabaja(celda(e.id, d))).length;
                        return <td key={d} style={{ padding: "8px 6px", textAlign: "center", fontWeight: 800, color: n === 0 ? ROJO : TEXT1 }}>{n}</td>;
                      })}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
