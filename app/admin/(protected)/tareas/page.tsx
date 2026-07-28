"use client";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, ROJO, VERDE, FONT, TITLE } from "../../../../lib/tokens";

type Estado = "pendiente" | "en_progreso" | "completada" | "bloqueada";
type Prioridad = "baja" | "media" | "alta" | "urgente";
type Rol = "admin" | "mesero" | "cocina" | "barra" | "caja";

interface Tarea {
  id: string; titulo: string; descripcion: string; asignado_a: string | null; rol_destino: Rol | null;
  estado: Estado; prioridad: Prioridad; fecha_limite: string | null; created_at: string;
  empleados: { nombre: string } | null;
}
interface Empleado { id: string; nombre: string; departamento: string }

const ESTADOS: { value: Estado; label: string; color: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "#706860" },
  { value: "en_progreso", label: "En progreso", color: AMR },
  { value: "completada", label: "Completada", color: VERDE },
  { value: "bloqueada", label: "Bloqueada", color: ROJO },
];
const PRIORIDADES: Prioridad[] = ["baja", "media", "alta", "urgente"];
const ROLES: Rol[] = ["admin", "mesero", "cocina", "barra", "caja"];

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [rol, setRol] = useState<Rol>("mesero");
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nueva, setNueva] = useState({ titulo: "", descripcion: "", asignado_a: "", rol_destino: "", prioridad: "media" as Prioridad, fecha_limite: "" });

  async function cargar() {
    const [meRes, tRes, eRes] = await Promise.all([fetch("/api/me"), fetch("/api/tareas"), fetch("/api/empleados")]);
    if (meRes.ok) { const me = await meRes.json(); if (me?.rol) setRol(me.rol); setEmpleadoId(me?.empleado_id ?? null); }
    if (tRes.ok) setTareas(await tRes.json());
    if (eRes.ok) setEmpleados(await eRes.json());
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

  async function cambiarEstado(id: string, estado: Estado) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
    await fetch(`/api/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
  }

  async function crear() {
    if (!nueva.titulo.trim() || (!nueva.asignado_a && !nueva.rol_destino)) return;
    const res = await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: nueva.titulo.trim(), descripcion: nueva.descripcion.trim(),
        asignado_a: nueva.asignado_a || null, rol_destino: nueva.rol_destino || null,
        prioridad: nueva.prioridad, fecha_limite: nueva.fecha_limite || null,
      }),
    });
    if (res.ok) { setNueva({ titulo: "", descripcion: "", asignado_a: "", rol_destino: "", prioridad: "media", fecha_limite: "" }); await cargar(); }
  }

  async function eliminar(id: string) {
    const res = await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    if (res.ok) setTareas(prev => prev.filter(t => t.id !== id));
  }

  const esAdmin = rol === "admin";
  const visibles = esAdmin ? tareas : tareas.filter(t => t.asignado_a === empleadoId || t.rol_destino === rol);
  const hoy = new Date().toISOString().slice(0, 10);
  const vencidas = visibles.filter(t => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada").length;

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17 };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Tareas</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{esAdmin ? "Vista completa · admin" : `Mis tareas · ${rol}`}</div>
        </div>

        {esAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {ESTADOS.map(e => (
              <div key={e.value} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, color: e.color }}>{visibles.filter(t => t.estado === e.value).length}</div>
                <div style={{ fontSize: 16, color: TEXT3, marginTop: 4 }}>{e.label}</div>
              </div>
            ))}
            <div style={{ background: "#231515", border: "1px solid #6b2020", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, color: ROJO }}>{vencidas}</div>
              <div style={{ fontSize: 16, color: "#fca5a5", marginTop: 4 }}>Vencidas</div>
            </div>
          </div>
        )}

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {visibles.map((t, idx) => {
              const est = ESTADOS.find(e => e.value === t.estado)!;
              const vencida = t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada";
              return (
                <div key={t.id} style={{ padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 99, background: est.color, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 19 }}>{t.titulo}</span>
                        <span style={{ fontSize: 16, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{t.prioridad}</span>
                        {t.rol_destino && <span style={{ fontSize: 16, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>rol: {t.rol_destino}</span>}
                        {t.empleados?.nombre && <span style={{ fontSize: 16, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{t.empleados.nombre}</span>}
                        {vencida && <span style={{ fontSize: 16, color: "#fca5a5", background: "#2a1212", borderRadius: 6, padding: "2px 8px" }}>vencida</span>}
                      </div>
                      {t.descripcion && <div style={{ fontSize: 17, color: TEXT2 }}>{t.descripcion}</div>}
                      {t.fecha_limite && <div style={{ fontSize: 16, color: TEXT3, marginTop: 2 }}>Vence: {t.fecha_limite}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 220 }}>
                      {ESTADOS.filter(e => e.value !== t.estado).map(e => (
                        <button key={e.value} onClick={() => cambiarEstado(t.id, e.value)}
                          style={{ fontSize: 16, color: TEXT3, background: SURF2, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: FONT }}>
                          → {e.label}
                        </button>
                      ))}
                      {esAdmin && <button onClick={() => eliminar(t.id)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}>🗑</button>}
                    </div>
                  </div>
                </div>
              );
            })}
            {visibles.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Sin tareas</div>}
          </div>
        )}

        {esAdmin && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>+ Nueva tarea</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Título" value={nueva.titulo} onChange={e => setNueva(n => ({ ...n, titulo: e.target.value }))} style={inp} />
              <textarea placeholder="Descripción" value={nueva.descripcion} onChange={e => setNueva(n => ({ ...n, descripcion: e.target.value }))} style={{ ...inp, minHeight: 60 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select value={nueva.asignado_a} onChange={e => setNueva(n => ({ ...n, asignado_a: e.target.value, rol_destino: e.target.value ? "" : n.rol_destino }))} style={inp}>
                  <option value="">Asignar a empleado…</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.departamento})</option>)}
                </select>
                <select value={nueva.rol_destino} onChange={e => setNueva(n => ({ ...n, rol_destino: e.target.value, asignado_a: e.target.value ? "" : n.asignado_a }))} style={inp}>
                  <option value="">…o asignar a todo un rol</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={nueva.prioridad} onChange={e => setNueva(n => ({ ...n, prioridad: e.target.value as Prioridad }))} style={inp}>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="date" value={nueva.fecha_limite} onChange={e => setNueva(n => ({ ...n, fecha_limite: e.target.value }))} style={inp} />
                <button onClick={crear} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Crear</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
