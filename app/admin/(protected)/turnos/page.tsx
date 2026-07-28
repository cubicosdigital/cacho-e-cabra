"use client";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
const DIA_LABEL: Record<string, string> = { lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb", domingo: "Dom" };
const DEPARTAMENTOS = ["cocina", "barra", "garzones", "coperia"] as const;
const TEMPORADA = "invierno-2026";

interface Empleado {
  id: string; nombre: string; departamento: string; tipo_contrato: string;
  usuario_admin_id: string | null; activo: boolean;
  usuarios_admin: { email: string; nombre: string } | null;
}
interface Turno {
  id: string; empleado_id: string; dia_semana: string;
  hora_entrada: string | null; hora_salida: string | null; horas: number; nota: string | null;
}
interface Cuenta { id: string; email: string; nombre: string; rol: string }

type DiaDraft = { entrada: string; salida: string; horas: string; nota: string };

export default function TurnosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, DiaDraft>>({});
  const [guardando, setGuardando] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", departamento: "cocina", tipo_contrato: "full_time" });

  async function cargar() {
    const [eRes, tRes, cRes] = await Promise.all([
      fetch("/api/empleados"), fetch("/api/turnos"), fetch("/api/usuarios-admin"),
    ]);
    if (eRes.ok) setEmpleados(await eRes.json());
    if (tRes.ok) setTurnos(await tRes.json());
    if (cRes.ok) setCuentas(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

  function abrir(emp: Empleado) {
    const mios = turnos.filter(t => t.empleado_id === emp.id);
    const next: Record<string, DiaDraft> = {};
    for (const dia of DIAS) {
      const t = mios.find(x => x.dia_semana === dia);
      next[dia] = {
        entrada: t?.hora_entrada?.slice(0, 5) ?? "",
        salida: t?.hora_salida?.slice(0, 5) ?? "",
        horas: t ? String(t.horas) : "0",
        nota: t?.nota ?? "",
      };
    }
    setDraft(next);
    setAbierto(abierto === emp.id ? null : emp.id);
  }

  async function guardarSemana(empleadoId: string) {
    setGuardando(true);
    const filas = DIAS.map(dia => ({
      dia_semana: dia,
      hora_entrada: draft[dia].entrada || null,
      hora_salida: draft[dia].salida || null,
      horas: parseFloat(draft[dia].horas) || 0,
      nota: draft[dia].nota || null,
    }));
    const res = await fetch("/api/turnos", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empleado_id: empleadoId, temporada: TEMPORADA, turnos: filas }),
    });
    setGuardando(false);
    if (res.ok) { await cargar(); setAbierto(null); }
  }

  async function vincularCuenta(empId: string, usuarioAdminId: string) {
    await fetch(`/api/empleados/${empId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_admin_id: usuarioAdminId || null }),
    });
    await cargar();
  }

  async function crearEmpleado() {
    if (!nuevo.nombre.trim()) return;
    const res = await fetch("/api/empleados", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    if (res.ok) { setNuevo({ nombre: "", departamento: nuevo.departamento, tipo_contrato: "full_time" }); await cargar(); }
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Turnos</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{empleados.length} empleados · temporada {TEMPORADA}</div>
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : DEPARTAMENTOS.map(depto => {
          const equipo = empleados.filter(e => e.departamento === depto);
          if (equipo.length === 0) return null;
          return (
            <div key={depto}>
              <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, textTransform: "capitalize", marginBottom: 10, color: AMR }}>{depto}</div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                {equipo.map((emp, idx) => {
                  const mios = turnos.filter(t => t.empleado_id === emp.id);
                  const total = mios.reduce((s, t) => s + t.horas, 0);
                  const open = abierto === emp.id;
                  return (
                    <div key={emp.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 19 }}>{emp.nombre}</div>
                          <div style={{ fontSize: 16, color: TEXT3 }}>
                            {emp.tipo_contrato === "part_time" ? "Part time" : "Full time"} · {total}h/semana
                            {emp.usuarios_admin && <> · vinculado a {emp.usuarios_admin.email}</>}
                          </div>
                        </div>
                        <select value={emp.usuario_admin_id ?? ""} onChange={e => vincularCuenta(emp.id, e.target.value)} style={inp}>
                          <option value="">Sin cuenta vinculada</option>
                          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.rol})</option>)}
                        </select>
                        <button onClick={() => abrir(emp)} style={{ background: open ? AMR : SURF2, color: open ? "#1a1200" : TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {open ? "Cerrar" : "Ver semana"}
                        </button>
                      </div>
                      {open && (
                        <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {DIAS.map(dia => (
                            <div key={dia} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ width: 36, fontSize: 16, color: TEXT3, fontWeight: 700 }}>{DIA_LABEL[dia]}</span>
                              <input type="time" value={draft[dia]?.entrada ?? ""} onChange={e => setDraft(d => ({ ...d, [dia]: { ...d[dia], entrada: e.target.value } }))} style={{ ...inp, width: 100 }} />
                              <span style={{ color: TEXT3 }}>→</span>
                              <input type="time" value={draft[dia]?.salida ?? ""} onChange={e => setDraft(d => ({ ...d, [dia]: { ...d[dia], salida: e.target.value } }))} style={{ ...inp, width: 100 }} />
                              <input type="number" step="0.5" placeholder="hrs" value={draft[dia]?.horas ?? "0"} onChange={e => setDraft(d => ({ ...d, [dia]: { ...d[dia], horas: e.target.value } }))} style={{ ...inp, width: 60 }} />
                              <input type="text" placeholder="nota (opcional)" value={draft[dia]?.nota ?? ""} onChange={e => setDraft(d => ({ ...d, [dia]: { ...d[dia], nota: e.target.value } }))} style={{ ...inp, flex: 1, minWidth: 160 }} />
                            </div>
                          ))}
                          <button onClick={() => guardarSemana(emp.id)} disabled={guardando}
                            style={{ alignSelf: "flex-start", marginTop: 6, background: VERDE, color: "#062018", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                            {guardando ? "Guardando…" : "Guardar semana"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>+ Agregar empleado</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 180 }} />
            <select value={nuevo.departamento} onChange={e => setNuevo(n => ({ ...n, departamento: e.target.value }))} style={inp}>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={nuevo.tipo_contrato} onChange={e => setNuevo(n => ({ ...n, tipo_contrato: e.target.value }))} style={inp}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
            </select>
            <button onClick={crearEmpleado} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Agregar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
