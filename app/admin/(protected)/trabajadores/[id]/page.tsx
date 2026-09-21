"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../../lib/tokens";
import { contratoCompleto, type Ficha } from "../../../../../lib/fichas";

interface Empleado { id: string; nombre: string; rut: string | null; cargo: string | null; departamento: string }

const fmtFecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : null);
const siNo = (v: boolean | null) => (v == null ? null : v ? "Sí" : "No");

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

export default function FichaTrabajadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
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
      if (res.ok) {
        const data = await res.json();
        setEmpleado(data.empleado);
        setFicha(data.ficha);
        aFormulario(data.ficha);
      }
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
    if (res.ok) { setFicha(data); setMsg({ ok: true, texto: contratoCompleto(data) ? "Contrato completo. La notificación quedó como leída." : "Guardado. Aún faltan datos del contrato." }); }
    else setMsg({ ok: false, texto: data.error });
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17, width: "100%", boxSizing: "border-box" };
  const completo = contratoCompleto(ficha);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(2); opacity: 1; width: 26px; height: 26px; cursor: pointer; }
      `}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/admin/trabajadores" style={{ display: "inline-block", background: SURF2, color: TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 16px", fontSize: 16, fontWeight: 700, textDecoration: "none", marginBottom: 16 }}>← Volver</Link>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>{empleado?.nombre ?? "Trabajador"}</div>
          {empleado && <div style={{ fontSize: 17, color: TEXT3 }}>{empleado.cargo} · {empleado.departamento} · RUT {empleado.rut ?? "—"}</div>}
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : !ficha?.registrado_at ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, color: TEXT2, fontSize: 17 }}>
            Este trabajador todavía no completa su ficha. Envíale la invitación desde la lista de Trabajadores.
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
