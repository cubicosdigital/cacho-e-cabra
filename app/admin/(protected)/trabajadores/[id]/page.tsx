"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, AZUL, FONT, TITLE } from "../../../../../lib/tokens";
import { contratoCompleto, type Ficha } from "../../../../../lib/fichas";
import { LATIDO_VIGENCIA_S, type Comando, type EstadoTerminal, type TipoComando } from "../../../../../lib/terminal";
import {
  DIAS_SEMANA, MESES, agruparPorPeriodo, fmtHoraMin, fmtHoras, minutos, parseFecha, resumirDias, type Marca,
} from "../../../../../lib/asistencia";
import { BarrasVerticales, FiltroFechas, Kpi, Panel, botonVolver, tarjeta } from "../../asistencia/graficos";

const DEPARTAMENTOS = ["cocina", "barra", "garzones", "coperia"] as const;
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
const DIA_LABEL: Record<string, string> = { lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue", viernes: "Vie", sabado: "Sáb", domingo: "Dom" };
const TEMPORADA = "invierno-2026";

interface Empleado {
  id: string; nombre: string; rut: string | null; cargo: string | null; departamento: string;
  tipo_contrato: string; control_asistencia: boolean; zk_id: number | null; activo: boolean;
}
interface Turno { id: string; empleado_id: string; dia_semana: string; hora_entrada: string | null; hora_salida: string | null; horas: number; nota: string | null }
type DiaDraft = { entrada: string; salida: string; horas: string; nota: string };
interface DatosTerminal { estado: EstadoTerminal | null; comandos: Comando[]; empleados: Empleado[]; ahora: string }

const TABS = [
  { id: "datos", label: "Datos" },
  { id: "contrato", label: "Contrato" },
  { id: "terminal", label: "Terminal" },
  { id: "asistencia", label: "Asistencia" },
  { id: "turnos", label: "Turnos" },
] as const;
type TabId = typeof TABS[number]["id"];

const fmtFecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : null);
const siNo = (v: boolean | null) => (v == null ? null : v ? "Sí" : "No");

function Spinner({ color: c = "currentColor", size = 14 }: { color?: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      borderWidth: 2, borderStyle: "solid", borderColor: c, borderTopColor: "transparent",
      animation: "girar .7s linear infinite", flexShrink: 0,
    }} />
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{etiqueta}</div>
      <div style={{ fontSize: 18, color: valor ? TEXT1 : TEXT3, marginTop: 2 }}>{valor || "—"}</div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>{titulo}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px" }}>{children}</div>
    </div>
  );
}

function conDia(fecha: string) {
  const f = parseFecha(fecha);
  const [y, m, d] = fecha.split("-");
  return <><strong>{DIAS_SEMANA[f.getDay()]}</strong> {d}/{m}/{y}</>;
}
function semanaDe(fecha: string) {
  const f = parseFecha(fecha);
  const lunes = new Date(f.getFullYear(), f.getMonth(), f.getDate() - ((f.getDay() + 6) % 7));
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  const n = Math.floor((lunes.getDate() - 1) / 7) + 1;
  const clave = `${lunes.getFullYear()}-${lunes.getMonth()}-${lunes.getDate()}`;
  const rango = lunes.getMonth() === domingo.getMonth()
    ? `${lunes.getDate()} al ${domingo.getDate()}`
    : `${lunes.getDate()} ${MESES[lunes.getMonth()].slice(0, 3)} al ${domingo.getDate()} ${MESES[domingo.getMonth()].slice(0, 3)}`;
  return { clave, titulo: `Semana ${n} de ${MESES[lunes.getMonth()]}`, rango };
}
function hoyISO() { return new Date().toISOString().slice(0, 10); }
function haceUnMesISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }

export default function FichaTrabajadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const buscador = useSearchParams();
  const tabInicial = TABS.find(t => t.id === buscador.get("tab"))?.id ?? "datos";
  const [tab, setTab] = useState<TabId>(tabInicial);

  function irA(t: TabId) {
    setTab(t);
    router.replace(`/admin/trabajadores/${id}?tab=${t}`, { scroll: false });
  }

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargando, setCargando] = useState(false);

  const cargarEmpleado = useCallback(async () => {
    const res = await fetch("/api/empleados");
    if (res.ok) setEmpleado((await res.json() as Empleado[]).find(e => e.id === id) ?? null);
    setLoading(false);
  }, [id]);
  useEffect(() => { (async () => { await cargarEmpleado(); })(); }, [cargarEmpleado]);

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17, width: "100%", boxSizing: "border-box" };

  if (loading) return <div style={{ minHeight: "100vh", background: BG, color: TEXT3, fontFamily: FONT, padding: 40 }}>Cargando…</div>;
  if (!empleado) return <div style={{ minHeight: "100vh", background: BG, color: ROJO, fontFamily: FONT, padding: 40 }}>No se encontró al trabajador.</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(2); opacity: 1; width: 26px; height: 26px; cursor: pointer; }
        @keyframes girar { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/admin/trabajadores" style={botonVolver}>← Volver</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>{empleado.nombre}</div>
            {!empleado.activo && (
              <span style={{ fontSize: 14, fontWeight: 700, color: ROJO, border: `1px solid ${ROJO}`, borderRadius: 999, padding: "3px 12px" }}>Dado de baja</span>
            )}
          </div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{empleado.cargo} · {empleado.departamento} · RUT {empleado.rut ?? "—"}</div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => irA(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: FONT,
              padding: "10px 16px", fontSize: 17, fontWeight: 700, color: tab === t.id ? AMR : TEXT3,
              borderBottom: tab === t.id ? `3px solid ${AMR}` : "3px solid transparent", marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "datos" && <TabDatos empleado={empleado} inp={inp} onGuardado={cargarEmpleado} cargando={cargando} setCargando={setCargando} />}
        {tab === "contrato" && <TabContrato id={id} inp={inp} />}
        {tab === "terminal" && <TabTerminal id={id} empleado={empleado} />}
        {tab === "asistencia" && <TabAsistencia id={id} empleado={empleado} />}
        {tab === "turnos" && <TabTurnos id={id} empleado={empleado} />}
      </div>
    </div>
  );
}

// ---------- Datos ----------

function TabDatos({ empleado, inp, onGuardado, cargando, setCargando }: {
  empleado: Empleado; inp: React.CSSProperties; onGuardado: () => Promise<void>;
  cargando: boolean; setCargando: (v: boolean) => void;
}) {
  const router = useRouter();
  const [d, setD] = useState({ nombre: empleado.nombre, rut: empleado.rut ?? "", cargo: empleado.cargo ?? "", departamento: empleado.departamento, tipo_contrato: empleado.tipo_contrato, control_asistencia: empleado.control_asistencia });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  async function guardar() {
    setCargando(true); setMsg(null);
    const res = await fetch(`/api/empleados/${empleado.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: d.nombre, rut: d.rut || null, cargo: d.cargo || null, departamento: d.departamento, tipo_contrato: d.tipo_contrato, control_asistencia: d.control_asistencia }),
    });
    const data = await res.json();
    setCargando(false);
    if (res.ok) { setMsg({ ok: true, texto: "Guardado." }); await onGuardado(); }
    else setMsg({ ok: false, texto: data.error });
  }

  async function toggleActivo() {
    setCargando(true); setMsg(null);
    const res = await fetch(`/api/empleados/${empleado.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !empleado.activo }),
    });
    setCargando(false);
    if (res.ok) await onGuardado();
    else setMsg({ ok: false, texto: (await res.json()).error });
  }

  async function eliminar() {
    setCargando(true); setMsg(null);
    const res = await fetch(`/api/empleados/${empleado.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setCargando(false);
    if (res.ok) { router.push("/admin/trabajadores"); return; }
    setConfirmarBorrado(false);
    setMsg({ ok: false, texto: data.error ?? "No se pudo eliminar." });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Datos básicos</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Nombre</div>
            <input value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })} style={inp} /></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>RUT</div>
            <input value={d.rut} onChange={e => setD({ ...d, rut: e.target.value })} style={inp} placeholder="12.345.678-9" /></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Cargo</div>
            <input value={d.cargo} onChange={e => setD({ ...d, cargo: e.target.value })} style={inp} /></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Departamento</div>
            <select value={d.departamento} onChange={e => setD({ ...d, departamento: e.target.value })} style={inp}>
              {DEPARTAMENTOS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </select></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Tipo de contrato</div>
            <select value={d.tipo_contrato} onChange={e => setD({ ...d, tipo_contrato: e.target.value })} style={inp}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
            </select></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
            <input type="checkbox" checked={d.control_asistencia} onChange={e => setD({ ...d, control_asistencia: e.target.checked })} style={{ width: 20, height: 20, accentColor: AMR, cursor: "pointer" }} />
            <span style={{ fontSize: 16, color: TEXT2 }}>Debe registrar asistencia</span>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={guardar} disabled={cargando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: FONT, opacity: cargando ? 0.6 : 1 }}>
            {cargando ? "Guardando…" : "Guardar datos"}
          </button>
          {msg && <span style={{ color: msg.ok ? VERDE : ROJO, fontSize: 16 }}>{msg.texto}</span>}
        </div>
      </div>

      <div style={{ ...tarjeta, borderColor: ROJO }}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Zona de riesgo</div>
        <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>
          Solo el super admin puede dar de baja o eliminar a un trabajador. Dar de baja es reversible y conserva su historial; eliminar es permanente y solo se permite si no tiene turnos ni asistencias guardadas.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={toggleActivo} disabled={cargando}
            style={{ background: SURF2, color: empleado.activo ? AMR : VERDE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: FONT }}>
            {empleado.activo ? "Dar de baja" : "Reactivar"}
          </button>
          {!confirmarBorrado ? (
            <button onClick={() => setConfirmarBorrado(true)} disabled={cargando}
              style={{ background: "none", color: ROJO, border: `1px solid ${ROJO}`, borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: FONT }}>
              Eliminar trabajador
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, color: ROJO }}>¿Confirmas eliminar a {empleado.nombre} para siempre?</span>
              <button onClick={eliminar} disabled={cargando} style={{ background: ROJO, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Sí, eliminar</button>
              <button onClick={() => setConfirmarBorrado(false)} style={{ background: SURF2, color: TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Contrato ----------

function TabContrato({ id, inp }: { id: string; inp: React.CSSProperties }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [c, setC] = useState({ fecha_ingreso: "", contrato_duracion: "", fecha_termino: "", jornada_horas_semanales: "", sueldo_base: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function aFormulario(f: Ficha | null) {
    setC({
      fecha_ingreso: f?.fecha_ingreso ?? "", contrato_duracion: f?.contrato_duracion ?? "", fecha_termino: f?.fecha_termino ?? "",
      jornada_horas_semanales: f?.jornada_horas_semanales != null ? String(f.jornada_horas_semanales) : "",
      sueldo_base: f?.sueldo_base != null ? String(f.sueldo_base) : "",
    });
  }

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/trabajadores/${id}/ficha`);
      if (res.ok) { const data = await res.json(); setFicha(data.ficha); aFormulario(data.ficha); }
      setLoading(false);
    })();
  }, [id]);

  async function guardar() {
    setGuardando(true); setMsg(null);
    const res = await fetch(`/api/trabajadores/${id}/ficha`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha_ingreso: c.fecha_ingreso, contrato_duracion: c.contrato_duracion, fecha_termino: c.contrato_duracion === "plazo_fijo" ? c.fecha_termino : "",
        jornada_horas_semanales: c.jornada_horas_semanales === "" ? "" : Number(c.jornada_horas_semanales),
        sueldo_base: c.sueldo_base === "" ? "" : Math.round(Number(c.sueldo_base)),
      }),
    });
    const data = await res.json();
    setGuardando(false);
    if (res.ok) { setFicha(data); setMsg({ ok: true, texto: contratoCompleto(data) ? "Contrato completo." : "Guardado. Aún faltan datos del contrato." }); }
    else setMsg({ ok: false, texto: data.error });
  }

  if (loading) return <div style={{ color: TEXT3 }}>Cargando…</div>;
  if (!ficha?.registrado_at) {
    return (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, color: TEXT2, fontSize: 17 }}>
        Este trabajador todavía no completa su ficha. Envíale la invitación desde la lista de Trabajadores.
      </div>
    );
  }

  const completo = contratoCompleto(ficha);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: SURFACE, border: `1px solid ${completo ? VERDE : AMR}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Datos del contrato</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: completo ? VERDE : AMR }}>{completo ? "Completo" : "Pendiente: los completas tú"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Fecha de ingreso</div>
            <input type="date" value={c.fecha_ingreso} onChange={e => setC({ ...c, fecha_ingreso: e.target.value })} style={inp} /></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Tipo de contrato</div>
            <select value={c.contrato_duracion} onChange={e => setC({ ...c, contrato_duracion: e.target.value })} style={inp}>
              <option value="">Seleccionar…</option>
              <option value="indefinido">Indefinido</option>
              <option value="plazo_fijo">Plazo fijo</option>
              <option value="por_obra">Por obra o faena</option>
            </select></label>
          {c.contrato_duracion === "plazo_fijo" && (
            <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Fecha de término</div>
              <input type="date" value={c.fecha_termino} onChange={e => setC({ ...c, fecha_termino: e.target.value })} style={inp} /></label>
          )}
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Jornada (horas por semana)</div>
            <input type="number" step="0.5" value={c.jornada_horas_semanales} onChange={e => setC({ ...c, jornada_horas_semanales: e.target.value })} style={inp} placeholder="44" /></label>
          <label><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Sueldo base (CLP)</div>
            <input type="number" value={c.sueldo_base} onChange={e => setC({ ...c, sueldo_base: e.target.value })} style={inp} placeholder="500000" /></label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={guardar} disabled={guardando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, fontSize: 17, cursor: "pointer", fontFamily: FONT, opacity: guardando ? 0.6 : 1 }}>
            {guardando ? "Guardando…" : "Guardar contrato"}
          </button>
          {msg && <span style={{ color: msg.ok ? VERDE : ROJO, fontSize: 16 }}>{msg.texto}</span>}
        </div>
      </div>

      <Seccion titulo="Contacto y domicilio">
        <Dato etiqueta="Correo" valor={ficha.email} /><Dato etiqueta="Teléfono" valor={ficha.telefono} />
        <Dato etiqueta="Dirección" valor={ficha.direccion} /><Dato etiqueta="Comuna" valor={ficha.comuna} />
        <Dato etiqueta="Nacimiento" valor={fmtFecha(ficha.fecha_nacimiento)} /><Dato etiqueta="Nacionalidad" valor={ficha.nacionalidad} />
        <Dato etiqueta="Estado civil" valor={ficha.estado_civil} />
      </Seccion>
      <Seccion titulo="Contacto de emergencia">
        <Dato etiqueta="Nombre" valor={ficha.emergencia_nombre} /><Dato etiqueta="Parentesco" valor={ficha.emergencia_parentesco} />
        <Dato etiqueta="Teléfono" valor={ficha.emergencia_telefono} />
      </Seccion>
      <Seccion titulo="Previsión">
        <Dato etiqueta="AFP" valor={ficha.afp} />
        <Dato etiqueta="Salud" valor={ficha.salud_sistema === "fonasa" ? "Fonasa" : ficha.salud_sistema === "isapre" ? `Isapre ${ficha.isapre_nombre ?? ""} ${ficha.isapre_plan ? `· ${ficha.isapre_plan}` : ""}` : null} />
        <Dato etiqueta="Seguro de cesantía" valor={siNo(ficha.seguro_cesantia)} />
      </Seccion>
      <Seccion titulo="Cargas familiares">
        {ficha.cargas.length === 0 ? <Dato etiqueta="Cargas" valor="Sin cargas informadas" /> :
          ficha.cargas.map((cg, i) => <Dato key={i} etiqueta={cg.parentesco || "Carga"} valor={`${cg.nombre} · ${cg.rut || "sin RUT"}`} />)}
      </Seccion>
      {(ficha.visa_tipo || ficha.visa_vencimiento) && (
        <Seccion titulo="Permiso de trabajo">
          <Dato etiqueta="Tipo" valor={ficha.visa_tipo} /><Dato etiqueta="Vence" valor={fmtFecha(ficha.visa_vencimiento)} />
        </Seccion>
      )}
      <Seccion titulo="Datos bancarios">
        <Dato etiqueta="Banco" valor={ficha.banco} /><Dato etiqueta="Tipo de cuenta" valor={ficha.tipo_cuenta} />
        <Dato etiqueta="Número" valor={ficha.numero_cuenta} />
      </Seccion>
      <Seccion titulo="Otros">
        <Dato etiqueta="Manipulador de alimentos" valor={ficha.manipulador_alimentos == null ? null : ficha.manipulador_alimentos ? `Sí${ficha.manipulador_vencimiento ? ` · vence ${fmtFecha(ficha.manipulador_vencimiento)}` : ""}` : "No"} />
        <Dato etiqueta="Consentimiento datos personales" valor={ficha.consentimiento ? `Aceptado el ${ficha.consentimiento_fecha ? new Date(ficha.consentimiento_fecha).toLocaleDateString("es-CL") : ""}` : "No aceptado"} />
        <Dato etiqueta="Ficha enviada" valor={ficha.registrado_at ? new Date(ficha.registrado_at).toLocaleString("es-CL") : null} />
      </Seccion>
    </div>
  );
}

// ---------- Terminal ----------

function TabTerminal({ id, empleado }: { id: string; empleado: Empleado }) {
  const [datos, setDatos] = useState<DatosTerminal | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/terminal");
    if (res.ok) setDatos(await res.json());
  }, []);
  useEffect(() => {
    (async () => { await cargar(); })();
    const t = setInterval(cargar, 4000);
    return () => clearInterval(t);
  }, [cargar]);

  async function ordenar(body: Record<string, unknown>, texto: string) {
    setAviso(null);
    const res = await fetch("/api/terminal/comandos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setAviso(res.ok ? { ok: true, texto: `${texto} Queda en cola y se ejecuta en unos segundos.` } : { ok: false, texto: d.error });
    await cargar();
  }

  if (!datos) return <div style={{ color: TEXT3 }}>Cargando…</div>;

  const { estado, comandos, ahora } = datos;
  const latidoS = estado?.ultimo_latido ? (Date.parse(ahora) - Date.parse(estado.ultimo_latido)) / 1000 : Infinity;
  const conectado = latidoS < LATIDO_VIGENCIA_S && estado?.terminal_ok === true;
  const u = empleado.zk_id != null ? (estado?.usuarios_detalle ?? []).find(x => x.user_id === String(empleado.zk_id)) : undefined;
  const enCurso = comandos.filter(c => (c.estado === "pendiente" || c.estado === "en_proceso") && c.payload?.zk_id === empleado.zk_id);
  const ocupado = (t: TipoComando) => enCurso.some(c => c.tipo === t);
  const propios = comandos.filter(c => c.payload?.zk_id === empleado.zk_id || c.payload?.empleado_id === id).slice(0, 10);

  const boton = (activo: boolean, principal = false): React.CSSProperties => ({
    background: principal ? AMR : SURF2, color: principal ? "#1a1200" : TEXT2, border: principal ? "none" : `1px solid ${BORDER}`,
    borderRadius: 8, padding: "10px 18px", fontSize: 16, fontWeight: 700, cursor: activo ? "pointer" : "not-allowed",
    fontFamily: FONT, opacity: activo ? 1 : 0.5,
  });
  function labelAccion(tipo: TipoComando, normal: string) {
    const c = enCurso.find(x => x.tipo === tipo);
    if (!c) return normal;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Spinner /> {c.estado === "en_proceso" ? "El terminal está recibiendo…" : "Enviando…"}</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ ...tarjeta, borderColor: conectado ? VERDE : ROJO, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 15, padding: "6px 14px", borderRadius: 999, background: conectado ? "#123822" : "#3a1414", color: conectado ? VERDE : ROJO, border: `1px solid ${conectado ? VERDE : ROJO}` }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: conectado ? VERDE : ROJO }} />
          {conectado ? "Terminal conectado" : "Terminal sin conexión"}
        </span>
        <div style={{ flex: 1, minWidth: 200, fontSize: 15, color: TEXT3 }}>
          ID en el terminal: {empleado.zk_id ?? "sin asignar"}
          {u && ` · figura como «${u.name}»`}
        </div>
        <span style={{ fontSize: 15, color: !u ? TEXT3 : u.huellas > 0 ? VERDE : AMR, fontWeight: 700 }}>
          {!u ? "No cargado en el terminal" : u.huellas > 0 ? `${u.huellas} huella${u.huellas > 1 ? "s" : ""} registrada${u.huellas > 1 ? "s" : ""}` : "Cargado, sin huella"}
        </span>
      </div>

      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Acciones</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button disabled={ocupado("sincronizar_usuarios")} onClick={() => ordenar({ tipo: "sincronizar_usuarios", empleado_ids: [id] }, "Carga al terminal enviada.")} style={boton(!ocupado("sincronizar_usuarios"), true)}>
            {labelAccion("sincronizar_usuarios", u ? "Actualizar en el terminal" : "Cargar al terminal")}
          </button>
          <button disabled={!u || ocupado("iniciar_huella")} title={u ? "" : "Primero carga al trabajador"}
            onClick={() => ordenar({ tipo: "iniciar_huella", empleado_id: id, dedo: Math.min(u?.huellas ?? 0, 9) }, `Registro de huella de ${empleado.nombre.split(" ")[0]} iniciado: mira la pantalla del terminal.`)}
            style={boton(!!u && !ocupado("iniciar_huella"))}>{labelAccion("iniciar_huella", "Registrar huella")}</button>
          <button disabled={!u || ocupado("borrar_usuario")}
            onClick={() => confirm(`¿Borrar a ${empleado.nombre} del terminal? Se pierden sus huellas allí.`) && ordenar({ tipo: "borrar_usuario", empleado_id: id }, "Borrado enviado.")}
            style={{ ...boton(!!u && !ocupado("borrar_usuario")), color: ROJO }}>{labelAccion("borrar_usuario", "Borrar del terminal")}</button>
          <Link href="/admin/terminal-zk" style={{ fontSize: 15, color: TEXT3, marginLeft: "auto" }}>Ver estado general del terminal →</Link>
        </div>
        {aviso && <div style={{ marginTop: 12, fontSize: 16, color: aviso.ok ? VERDE : ROJO }}>{aviso.texto}</div>}
      </div>

      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Últimas órdenes</div>
        {propios.length === 0 && <div style={{ color: TEXT3, fontSize: 16 }}>Sin órdenes registradas.</div>}
        {propios.map(c => {
          const [col, txt] = c.estado === "ok" ? [VERDE, "Listo"] : c.estado === "error" ? [ROJO, "Error"] : c.estado === "en_proceso" ? [AZUL, "Ejecutando"] : [AMR, "En cola"];
          return (
            <div key={c.id} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "8px 0", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
              <div style={{ width: 70, fontSize: 14, color: TEXT3 }}>{new Date(c.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: col, border: `1px solid ${col}`, borderRadius: 999, padding: "2px 10px" }}>{txt}</span>
              <div style={{ flex: 1, minWidth: 200, fontSize: 15, color: TEXT2 }}>{c.resultado}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Asistencia ----------

function TabAsistencia({ id, empleado }: { id: string; empleado: Empleado }) {
  const [registros, setRegistros] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/asistencia?empleado_id=${id}&desde=${desde}&hasta=${hasta}`);
      if (res.ok) setRegistros(await res.json());
      setLoading(false);
    })();
  }, [id, desde, hasta]);

  const dias = useMemo(() => resumirDias(registros).sort((a, b) => b.fecha.localeCompare(a.fecha)), [registros]);
  const stats = useMemo(() => {
    const totalMin = dias.reduce((s, d) => s + (d.trabajado ?? 0), 0);
    const completos = dias.filter(d => d.trabajado != null);
    const conEntrada = dias.filter(d => d.entrada);
    const atrasos = dias.filter(d => d.tarde).length;
    const puntualidad = conEntrada.length ? Math.round(((conEntrada.length - atrasos) / conEntrada.length) * 100) : 0;
    const promEntrada = conEntrada.length ? conEntrada.reduce((s, d) => s + minutos(d.entrada!), 0) / conEntrada.length : null;
    const promDia = completos.length ? totalMin / completos.length : 0;
    const mejor = completos.reduce<typeof completos[number] | null>((m, d) => (!m || d.trabajado! > m.trabajado! ? d : m), null);
    return { totalMin, atrasos, puntualidad, promEntrada, promDia, mejor };
  }, [dias]);
  const horasPeriodo = useMemo(() => agruparPorPeriodo(dias, d => d.trabajado ?? 0), [dias]);
  const semanas = useMemo(() => {
    const out: { clave: string; titulo: string; rango: string; dias: typeof dias; minutos: number }[] = [];
    for (const d of dias) {
      const w = semanaDe(d.fecha);
      let g = out.find(x => x.clave === w.clave);
      if (!g) { g = { ...w, dias: [], minutos: 0 }; out.push(g); }
      g.dias.push(d);
      g.minutos += d.trabajado ?? 0;
    }
    return out;
  }, [dias]);
  const colorPunt = (p: number) => (p >= 90 ? VERDE : p >= 75 ? AMR : ROJO);

  if (!empleado.control_asistencia) {
    return <div style={{ ...tarjeta, color: TEXT3, fontSize: 16 }}>Este trabajador no está marcado para registrar asistencia.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <FiltroFechas desde={desde} hasta={hasta} onAplicar={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>
      {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : dias.length === 0 ? (
        <div style={{ ...tarjeta, color: TEXT3, fontSize: 16 }}>Sin registros en este rango.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Kpi etiqueta="Horas trabajadas" valor={fmtHoras(stats.totalMin)} nota={`${fmtHoras(stats.promDia)} por día en promedio`} color={AMR} />
            <Kpi etiqueta="Días trabajados" valor={String(dias.length)} nota={stats.mejor ? `Su día más largo: ${fmtHoras(stats.mejor.trabajado!)}` : undefined} />
            <Kpi etiqueta="Puntualidad" valor={`${stats.puntualidad}%`} nota={`${stats.atrasos} atrasos`} color={colorPunt(stats.puntualidad)} />
            <Kpi etiqueta="Entrada promedio" valor={stats.promEntrada != null ? fmtHoraMin(stats.promEntrada) : "—"} nota="hora media de llegada" />
          </div>
          <Panel titulo="Horas por día" subtitulo={horasPeriodo.porSemana ? "Total por semana en el rango elegido" : "Pasa el mouse sobre una barra para ver el detalle"}>
            <BarrasVerticales barras={horasPeriodo.barras.map(b => ({ ...b, valor: b.valor / 60 }))} formato={v => `${v.toFixed(1)} h`} />
          </Panel>
          <div style={tarjeta}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Registros</div>
            <div style={{ display: "flex", gap: 14, padding: "6px 4px", fontSize: 14, color: TEXT3, fontWeight: 700, textTransform: "uppercase" }}>
              <div style={{ width: 190 }}>Fecha</div><div style={{ width: 90 }}>Entrada</div>
              <div style={{ width: 90 }}>Salida</div><div style={{ flex: 1 }}>Horas trabajadas</div>
            </div>
            {semanas.map(w => (
              <div key={w.clave}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "14px 4px 6px", borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, color: AMR, textTransform: "uppercase" }}>{w.titulo}</div>
                  <div style={{ fontSize: 15, color: TEXT3 }}>({w.rango})</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700 }}>{fmtHoras(w.minutos)}</div>
                </div>
                {w.dias.map(d => (
                  <div key={d.fecha} style={{ display: "flex", gap: 14, padding: "8px 4px", borderTop: `1px solid ${BORDER}`, fontSize: 16 }}>
                    <div style={{ width: 190, color: TEXT2 }}>{conDia(d.fecha)}</div>
                    <div style={{ width: 90, color: d.tarde ? ROJO : VERDE, fontWeight: 700 }}>{d.entrada?.slice(0, 5) ?? "—"}</div>
                    <div style={{ width: 90, color: AMR, fontWeight: 700 }}>{d.salida?.slice(0, 5) ?? "—"}</div>
                    <div style={{ flex: 1, color: TEXT2 }}>{d.trabajado != null ? fmtHoras(d.trabajado) : "incompleto"}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Turnos ----------

function TabTurnos({ id, empleado }: { id: string; empleado: Empleado }) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, DiaDraft>>({});
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/turnos");
    if (res.ok) {
      const todos: Turno[] = await res.json();
      const mios = todos.filter(t => t.empleado_id === id);
      setTurnos(mios);
      const next: Record<string, DiaDraft> = {};
      for (const dia of DIAS) {
        const t = mios.find(x => x.dia_semana === dia);
        next[dia] = { entrada: t?.hora_entrada?.slice(0, 5) ?? "", salida: t?.hora_salida?.slice(0, 5) ?? "", horas: t ? String(t.horas) : "0", nota: t?.nota ?? "" };
      }
      setDraft(next);
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { (async () => { await cargar(); })(); }, [cargar]);

  async function guardarSemana() {
    setGuardando(true); setMsg(null);
    const filas = DIAS.map(dia => ({
      dia_semana: dia, hora_entrada: draft[dia].entrada || null, hora_salida: draft[dia].salida || null,
      horas: parseFloat(draft[dia].horas) || 0, nota: draft[dia].nota || null,
    }));
    const res = await fetch("/api/turnos", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empleado_id: id, temporada: TEMPORADA, turnos: filas }),
    });
    setGuardando(false);
    if (res.ok) { setMsg({ ok: true, texto: "Semana guardada." }); await cargar(); }
    else setMsg({ ok: false, texto: (await res.json()).error });
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 };
  const total = turnos.reduce((s, t) => s + t.horas, 0);

  if (loading) return <div style={{ color: TEXT3 }}>Cargando…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Semana · temporada {TEMPORADA}</div>
        <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>{empleado.tipo_contrato === "part_time" ? "Part time" : "Full time"} · {total}h/semana</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <button onClick={guardarSemana} disabled={guardando} style={{ background: VERDE, color: "#062018", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: guardando ? 0.6 : 1 }}>
            {guardando ? "Guardando…" : "Guardar semana"}
          </button>
          {msg && <span style={{ color: msg.ok ? VERDE : ROJO, fontSize: 16 }}>{msg.texto}</span>}
        </div>
      </div>
    </div>
  );
}
