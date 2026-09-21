"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BG, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../../lib/tokens";
import {
  HORA_ENTRADA_ESPERADA, TOLERANCIA_MIN, DIAS_SEMANA, agruparPorPeriodo, fmtHoras, parseFecha, resumirDias, type Marca,
} from "../../../../../lib/asistencia";
import { BarrasHorizontales, BarrasVerticales, FiltroFechas, Kpi, Panel, botonVolver, tarjeta } from "../graficos";

interface Empleado { id: string; nombre: string; control_asistencia: boolean }
interface Asistencia extends Marca {
  id: string;
  empleados: { nombre: string; cargo: string | null; departamento: string } | null;
}

function hoyISO() { return new Date().toISOString().slice(0, 10); }
function haceUnMesISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }

function conDia(fecha: string) {
  const f = parseFecha(fecha);
  const [y, m, d] = fecha.split("-");
  return <><strong>{DIAS_SEMANA[f.getDay()]}</strong> {d}/{m}/{y}</>;
}

export default function RegistrosGeneralesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [eRes, aRes] = await Promise.all([
        fetch("/api/empleados"),
        fetch(`/api/asistencia?desde=${desde}&hasta=${hasta}`),
      ]);
      if (eRes.ok) setEmpleados(await eRes.json());
      if (aRes.ok) setAsistencias(await aRes.json());
      setLoading(false);
    })();
  }, [desde, hasta]);

  const controlados = useMemo(() => empleados.filter(e => e.control_asistencia), [empleados]);
  const dias = useMemo(() => resumirDias(asistencias), [asistencias]);

  const stats = useMemo(() => {
    const totalMin = dias.reduce((s, d) => s + (d.trabajado ?? 0), 0);
    const fechas = [...new Set(dias.map(d => d.fecha))];
    const esperados = fechas.length * controlados.length;
    const ausencias = Math.max(0, esperados - dias.length);
    const atrasos = dias.filter(d => d.tarde).length;
    const conEntrada = dias.filter(d => d.entrada).length;
    const puntualidad = conEntrada ? Math.round(((conEntrada - atrasos) / conEntrada) * 100) : 0;
    const asistenciaPct = esperados ? Math.round((dias.length / esperados) * 100) : 0;
    const promedioDia = fechas.length ? totalMin / fechas.length : 0;
    return { totalMin, fechas: fechas.length, ausencias, atrasos, puntualidad, asistenciaPct, promedioDia };
  }, [dias, controlados]);

  const horasPeriodo = useMemo(() => agruparPorPeriodo(dias, d => d.trabajado ?? 0), [dias]);
  const presentesPeriodo = useMemo(() => {
    const porDia = new Map<string, number>();
    for (const d of dias) porDia.set(d.fecha, (porDia.get(d.fecha) ?? 0) + 1);
    const arr = [...porDia.entries()].map(([fecha, n]) => ({ empleado_id: "", fecha, entrada: null, salida: null, trabajado: n, tarde: false }));
    return agruparPorPeriodo(arr, d => d.trabajado ?? 0);
  }, [dias]);

  const porTrabajador = useMemo(() => {
    const nombre = new Map(empleados.map(e => [e.id, e.nombre]));
    return controlados.map(e => {
      const mios = dias.filter(d => d.empleado_id === e.id);
      const min = mios.reduce((s, d) => s + (d.trabajado ?? 0), 0);
      const conEntrada = mios.filter(d => d.entrada);
      const aTiempo = conEntrada.filter(d => !d.tarde).length;
      return {
        id: e.id, nombre: nombre.get(e.id) ?? "", min, dias: mios.length,
        puntualidad: conEntrada.length ? Math.round((aTiempo / conEntrada.length) * 100) : 0,
      };
    });
  }, [dias, controlados, empleados]);

  const rankingHoras = [...porTrabajador].sort((a, b) => b.min - a.min);
  const rankingPuntualidad = [...porTrabajador].filter(t => t.dias > 0).sort((a, b) => b.puntualidad - a.puntualidad);
  const colorPunt = (p: number) => (p >= 90 ? VERDE : p >= 75 ? AMR : ROJO);
  const irATrabajador = (id: string) => `/admin/asistencia/${id}`;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Link href="/admin/asistencia" style={botonVolver}>← Volver</Link>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Registros generales</div>
              <div style={{ fontSize: 17, color: TEXT3 }}>
                {controlados.length} trabajadores con control · atraso = entrada después de las {HORA_ENTRADA_ESPERADA} + {TOLERANCIA_MIN} min
              </div>
            </div>
            <FiltroFechas desde={desde} hasta={hasta} onAplicar={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Kpi etiqueta="Horas trabajadas" valor={fmtHoras(stats.totalMin)} nota={`${fmtHoras(stats.promedioDia)} por día en promedio`} color={AMR} />
              <Kpi etiqueta="Asistencia" valor={`${stats.asistenciaPct}%`} nota={`${stats.ausencias} ausencias en ${stats.fechas} días`} color={colorPunt(stats.asistenciaPct)} />
              <Kpi etiqueta="Puntualidad" valor={`${stats.puntualidad}%`} nota={`${stats.atrasos} atrasos`} color={colorPunt(stats.puntualidad)} />
              <Kpi etiqueta="Días con marcas" valor={String(stats.fechas)} nota={`${asistencias.length} marcaciones`} />
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 480px", minWidth: 0 }}>
                <Panel titulo="Horas trabajadas" subtitulo={horasPeriodo.porSemana ? "Total del equipo por semana" : "Total del equipo por día"}>
                  <BarrasVerticales barras={horasPeriodo.barras.map(b => ({ ...b, valor: b.valor / 60 }))} formato={v => `${Math.round(v)} h`} />
                </Panel>
              </div>
              <div style={{ flex: "1 1 480px", minWidth: 0 }}>
                <Panel titulo="Personas presentes" subtitulo={presentesPeriodo.porSemana ? "Marcaciones-día por semana" : "Cuántos vinieron cada día"}>
                  <BarrasVerticales barras={presentesPeriodo.barras} formato={v => `${v} ${presentesPeriodo.porSemana ? "asistencias" : "personas"}`} color={VERDE} />
                </Panel>
              </div>
            </div>

            <Panel titulo="Ranking de horas" subtitulo="Quién trabajó más en el período (clic para ver su detalle)">
              <BarrasHorizontales filas={rankingHoras.map(t => ({ id: t.id, etiqueta: t.nombre, valor: t.min }))} formato={fmtHoras} href={irATrabajador} />
            </Panel>

            <Panel titulo="Puntualidad" subtitulo="% de días en que llegó a tiempo">
              <BarrasHorizontales
                filas={rankingPuntualidad.map(t => ({ id: t.id, etiqueta: t.nombre, valor: t.puntualidad, color: colorPunt(t.puntualidad) }))}
                formato={v => `${v}%`} href={irATrabajador} />
            </Panel>

            <div style={tarjeta}>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Registros</div>
              {asistencias.length === 0 && <div style={{ color: TEXT3, fontSize: 16 }}>Sin registros en este rango.</div>}
              {asistencias.slice(0, 200).map(a => (
                <div key={a.id} style={{ display: "flex", gap: 14, padding: "8px 4px", borderBottom: `1px solid ${BORDER}`, fontSize: 16 }}>
                  <div style={{ width: 190, color: TEXT3 }}>{conDia(a.fecha)}</div>
                  <div style={{ width: 70, color: TEXT3 }}>{a.hora.slice(0, 5)}</div>
                  <div style={{ width: 90, color: a.tipo === "entrada" ? VERDE : AMR, fontWeight: 700, textTransform: "capitalize" }}>{a.tipo}</div>
                  <div style={{ flex: 1, color: TEXT2 }}>{a.empleados?.nombre}</div>
                </div>
              ))}
              {asistencias.length > 200 && (
                <div style={{ color: TEXT3, fontSize: 15, marginTop: 10 }}>Mostrando los 200 más recientes de {asistencias.length}.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
