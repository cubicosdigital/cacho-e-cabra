"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { BG, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../../lib/tokens";
import {
  DIAS_SEMANA, MESES, agruparPorPeriodo, fmtHoraMin, fmtHoras, minutos, parseFecha, resumirDias, type Marca,
} from "../../../../../lib/asistencia";
import { BarrasVerticales, FiltroFechas, Kpi, Panel, botonVolver, tarjeta } from "../graficos";

interface Empleado { id: string; nombre: string; cargo: string | null; departamento: string; zk_id: number | null }

function hoyISO() { return new Date().toISOString().slice(0, 10); }
function haceUnMesISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }

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

export default function AsistenciaEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [registros, setRegistros] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [eRes, aRes] = await Promise.all([
        fetch("/api/empleados"),
        fetch(`/api/asistencia?empleado_id=${id}&desde=${desde}&hasta=${hasta}`),
      ]);
      if (eRes.ok) setEmpleado((await eRes.json() as Empleado[]).find(e => e.id === id) ?? null);
      if (aRes.ok) setRegistros(await aRes.json());
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

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <Link href="/admin/asistencia" style={botonVolver}>← Volver</Link>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>{empleado?.nombre ?? "Trabajador"}</div>
              {empleado && (
                <div style={{ fontSize: 17, color: TEXT3 }}>
                  {empleado.cargo} · {empleado.departamento} · ID terminal: {empleado.zk_id ?? "sin asignar"}
                </div>
              )}
            </div>
            <FiltroFechas desde={desde} hasta={hasta} onAplicar={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
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
    </div>
  );
}
