"use client";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
const DIA_LABEL: Record<string, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };

interface Turno { dia_semana: string; hora_entrada: string | null; hora_salida: string | null; horas: number; nota: string | null }
interface Empleado { nombre: string; departamento: string; tipo_contrato: string }

export default function MiHorarioPage() {
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/mi-horario");
      if (res.ok) {
        const data = await res.json();
        setEmpleado(data.empleado);
        setTurnos(data.turnos ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const totalHoras = turnos.reduce((s, t) => s + t.horas, 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Mi horario</div>
          {empleado && <div style={{ fontSize: 17, color: TEXT3 }}>{empleado.nombre} · {empleado.departamento} · {empleado.tipo_contrato === "part_time" ? "Part time" : "Full time"} · {totalHoras}h/semana</div>}
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : !empleado ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, color: TEXT2, textAlign: "center" }}>
            Aún no tienes un horario asignado — pídele a tu administrador que vincule tu cuenta a un empleado en el módulo de Turnos.
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {DIAS.map((dia, idx) => {
              const t = turnos.find(x => x.dia_semana === dia);
              const libre = !t?.hora_entrada;
              return (
                <div key={dia} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
                  <div style={{ width: 100, fontWeight: 700, fontSize: 18 }}>{DIA_LABEL[dia]}</div>
                  {libre ? (
                    <span style={{ fontSize: 17, color: TEXT3 }}>Libre</span>
                  ) : (
                    <>
                      <span style={{ background: SURF2, borderRadius: 8, padding: "4px 12px", fontSize: 17, color: AMR, fontWeight: 700 }}>
                        {t!.hora_entrada!.slice(0, 5)} → {t!.hora_salida!.slice(0, 5)}
                      </span>
                      <span style={{ fontSize: 16, color: TEXT3 }}>{t!.horas}h</span>
                    </>
                  )}
                  {t?.nota && <span style={{ fontSize: 16, color: TEXT2, marginLeft: "auto", fontStyle: "italic", maxWidth: 260, textAlign: "right" }}>{t.nota}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
