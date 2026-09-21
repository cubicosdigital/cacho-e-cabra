"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, AZUL, FONT, TITLE } from "../../../lib/tokens";
import { fmtHoras } from "../../../lib/asistencia";

/* ───────────────────────── Tipos (lo que entrega /api/dashboard) ───────────────────────── */
interface DiaVenta { fecha: string; local: number; delivery: number; pedidos: number }
interface ItemVenta { fecha: string; nombre: string; categoria: string; cantidad: number; monto: number }
interface Aviso { nivel: "rojo" | "ambar" | "info"; texto: string; href: string }
interface Persona { id: string; nombre: string; cargo: string | null; estado: "dentro" | "salio" | "sin_marcar"; desde: string | null; tarde: boolean; esperado: boolean; ausente: boolean }
interface Vencimiento { empleado_id: string; nombre: string; tipo: string; fecha: string; dias: number }
interface EventoDash { id: string; titulo: string; emoji: string; registrados: number; cupos: number; precio: number; estado: string; porConfirmar: number }
interface Datos {
  ahora: string; hoy: string; hora: string; avisos: Aviso[];
  ventas: {
    hoy: number; hoyLocal: number; hoyDelivery: number; mismoDiaSemPasada: number; diaSemana: string;
    mes: number; mesAnterior: number; ticket30: number; pedidos30: number; mejorDia: { fecha: string; total: number } | null;
    porDia: DiaVenta[]; items: ItemVenta[];
    activos: { local: number; delivery: number; recibidos: number; esperaMaxMin: number };
  };
  equipo: {
    hoy: Persona[]; dentro: number; esperadosHoy: number; total: number;
    semana: { horasMin: number; puntualidad: number | null; diasConMarcas: number };
    terminal: { conectado: boolean; ultimaSync: string | null; marcaciones: number | null; usuarios: number | null };
  };
  trabajadores: { total: number; sinFicha: number; contratosPendientes: number; porVencer: Vencimiento[] };
  pendientes: { reclamos: number; denuncias: number; tareas: number; tareasVencidas: number; tareasUrgentes: number; notificaciones: number };
  presupuestos: { enviados: number; monto: number; aceptados: number; montoAceptado: number; sinResponder: number };
  eventos: EventoDash[];
  carta: { productos: number; agotados: number };
}

/* ───────────────────────── Utilidades ───────────────────────── */
const plata = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const sumarDias = (f: string, n: number) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const corto = (f: string) => `${f.slice(8)}/${f.slice(5, 7)}`;
const primerNombre = (n: string) => n.split(" ")[0];
const iniciales = (n: string) => { const p = n.split(" "); return `${p[0]?.[0] ?? ""}${p[p.length - 1]?.[0] ?? ""}`.toUpperCase(); };
const DIA_LARGO: Record<string, string> = { lunes: "lunes", martes: "martes", miercoles: "miércoles", jueves: "jueves", viernes: "viernes", sabado: "sábado", domingo: "domingo" };

const CATEGORIA_COLOR: Record<string, string> = { comida: AMR, brunch: "#fb923c", tragos: "#c084fc", cafeteria: "#a3826b", postres: "#f472b6", chef: VERDE, delivery: AZUL };
const colorCategoria = (c: string) => CATEGORIA_COLOR[c] ?? TEXT3;

/** Número que "corre" hasta su valor nuevo cada vez que cambia. */
function useContador(objetivo: number, duracion = 900) {
  const [v, setV] = useState(0);
  const actual = useRef(0);
  useEffect(() => {
    const inicio = actual.current, t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / duracion);
      actual.current = inicio + (objetivo - inicio) * (1 - Math.pow(1 - p, 3));
      setV(actual.current);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, duracion]);
  return v;
}

const tarjeta: React.CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 };
const tituloSeccion: React.CSSProperties = { fontFamily: TITLE, fontSize: 19, fontWeight: 900, color: TEXT1 };

/* ───────────────────────── Piezas visuales ───────────────────────── */
function Delta({ actual, previo, etiqueta }: { actual: number; previo: number; etiqueta: string }) {
  if (previo <= 0) return <span style={{ color: TEXT3 }}>{actual > 0 ? "Aún sin con qué comparar" : "Sin datos para comparar"}</span>;
  const p = Math.round(((actual - previo) / previo) * 100);
  const sube = p >= 0;
  return <span style={{ color: sube ? VERDE : ROJO, fontWeight: 700 }}>{sube ? "▲" : "▼"} {Math.abs(p)}% <span style={{ color: TEXT3, fontWeight: 500 }}>{etiqueta}</span></span>;
}

function Sparkline({ valores, color }: { valores: number[]; color: string }) {
  const w = 120, h = 34, max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => `${(i / Math.max(valores.length - 1, 1)) * w},${h - 3 - (v / max) * (h - 8)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={color} opacity={0.16} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiGrande({ titulo, valor, formato, pie, extra, color = TEXT1, href }: {
  titulo: string; valor: number; formato: (n: number) => string; pie: React.ReactNode; extra?: React.ReactNode; color?: string; href?: string;
}) {
  const v = useContador(valor);
  const contenido = (
    <div style={{ ...tarjeta, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{titulo}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontFamily: TITLE, fontSize: 40, fontWeight: 900, color, lineHeight: 1.05 }}>{formato(v)}</div>
        {extra}
      </div>
      <div style={{ fontSize: 14, color: TEXT2, marginTop: "auto" }}>{pie}</div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{contenido}</Link> : contenido;
}

function GraficoVentas({ dias }: { dias: { fecha: string; local: number; delivery: number }[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  const max = Math.max(...dias.map(d => d.local + d.delivery), 1);
  const cada = Math.ceil(dias.length / 12);
  const gap = dias.length > 60 ? 1 : 3;
  return (
    <div>
      <div style={{ height: 24, fontSize: 15, fontWeight: 700, color: TEXT2 }}>
        {activa != null && (
          <>{corto(dias[activa].fecha)}: {plata(dias[activa].local + dias[activa].delivery)}
            <span style={{ color: TEXT3, fontWeight: 500 }}> · local {plata(dias[activa].local)} · delivery {plata(dias[activa].delivery)}</span></>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap, height: 190, borderBottom: `1px solid ${BORDER}` }}>
        {dias.map((d, i) => {
          const total = d.local + d.delivery;
          return (
            <div key={d.fecha} onMouseEnter={() => setActiva(i)} onMouseLeave={() => setActiva(null)}
              style={{ flex: 1, minWidth: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", opacity: activa == null || activa === i ? 1 : 0.4, transition: "opacity .12s" }}>
              <div style={{ height: `${(d.delivery / max) * 100}%`, background: AZUL, borderRadius: d.local === 0 ? "3px 3px 0 0" : 0 }} />
              <div style={{ height: `${(d.local / max) * 100}%`, background: AMR, borderRadius: "3px 3px 0 0", minHeight: total > 0 && d.local === 0 ? 0 : undefined }} />
              {total === 0 && <div style={{ height: 2, background: BORDER }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap, marginTop: 6 }}>
        {dias.map((d, i) => <div key={d.fecha} style={{ flex: 1, minWidth: 1, fontSize: 11, color: TEXT3, textAlign: "center", whiteSpace: "nowrap", overflow: "visible" }}>{i % cada === 0 ? corto(d.fecha) : ""}</div>)}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13, color: TEXT2 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: AMR, borderRadius: 2, marginRight: 6 }} />Local</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: AZUL, borderRadius: 2, marginRight: 6 }} />Delivery</span>
      </div>
    </div>
  );
}

function Barra({ etiqueta, valor, max, texto, color = AMR, nota }: { etiqueta: string; valor: number; max: number; texto: string; color?: string; nota?: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 15, marginBottom: 4 }}>
        <span style={{ color: TEXT1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etiqueta}</span>
        <span style={{ color: TEXT2, fontWeight: 700, flexShrink: 0 }}>{texto}</span>
      </div>
      <div style={{ background: SURF2, borderRadius: 999, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (valor / Math.max(max, 1)) * 100)}%`, height: "100%", background: color, borderRadius: 999, transition: "width .6s ease" }} />
      </div>
      {nota && <div style={{ fontSize: 13, color: TEXT3, marginTop: 3 }}>{nota}</div>}
    </div>
  );
}

function Pastilla({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 13, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 10px", whiteSpace: "nowrap" }}>{children}</span>;
}

/* ───────────────────────── Página ───────────────────────── */
const RANGOS = [{ dias: 7, label: "7 días" }, { dias: 30, label: "30 días" }, { dias: 90, label: "90 días" }, { dias: 180, label: "6 meses" }];

export default function DashboardPage() {
  const router = useRouter();
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [rango, setRango] = useState(30);
  const [segundos, setSegundos] = useState(0);
  const cargadoEn = useRef(0);

  useEffect(() => {
    let vivo = true;
    cargadoEn.current = Date.now();
    async function cargar() {
      const res = await fetch("/api/dashboard");
      if (!vivo) return;
      if (res.status === 403) { router.replace("/admin/pedidos"); return; }
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "No se pudo cargar el dashboard"); return; }
      setD(await res.json()); setError(""); cargadoEn.current = Date.now(); setSegundos(0);
    }
    cargar();
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(m => { if (vivo && m?.nombre) setNombre(primerNombre(m.nombre)); }).catch(() => {});
    const refrescar = setInterval(cargar, 15000);
    const reloj = setInterval(() => setSegundos(Math.round((Date.now() - cargadoEn.current) / 1000)), 1000);
    return () => { vivo = false; clearInterval(refrescar); clearInterval(reloj); };
  }, [router]);

  const dias = useMemo(() => {
    if (!d) return [];
    const mapa = new Map(d.ventas.porDia.map(x => [x.fecha, x]));
    return Array.from({ length: rango }, (_, i) => {
      const fecha = sumarDias(d.hoy, -(rango - 1 - i));
      const x = mapa.get(fecha);
      return { fecha, local: x?.local ?? 0, delivery: x?.delivery ?? 0, pedidos: x?.pedidos ?? 0 };
    });
  }, [d, rango]);

  const enRango = useMemo(() => {
    if (!d) return { total: 0, pedidos: 0, top: [] as { nombre: string; cantidad: number; monto: number }[], cats: [] as { categoria: string; monto: number }[] };
    const desde = sumarDias(d.hoy, -(rango - 1));
    const its = d.ventas.items.filter(i => i.fecha >= desde);
    const porNombre = new Map<string, { nombre: string; cantidad: number; monto: number }>();
    const porCat = new Map<string, number>();
    for (const i of its) {
      const a = porNombre.get(i.nombre) ?? { nombre: i.nombre, cantidad: 0, monto: 0 };
      a.cantidad += i.cantidad; a.monto += i.monto; porNombre.set(i.nombre, a);
      porCat.set(i.categoria, (porCat.get(i.categoria) ?? 0) + i.monto);
    }
    return {
      total: dias.reduce((s, x) => s + x.local + x.delivery, 0), pedidos: dias.reduce((s, x) => s + x.pedidos, 0),
      top: [...porNombre.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 6),
      cats: [...porCat.entries()].map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto),
    };
  }, [d, dias, rango]);

  if (error && !d) return <div style={{ minHeight: "100vh", background: BG, color: ROJO, fontFamily: FONT, padding: 40 }}>{error}</div>;
  if (!d) return <div style={{ minHeight: "100vh", background: BG, color: TEXT3, fontFamily: FONT, padding: 40 }}>Cargando tu resumen…</div>;

  const v = d.ventas, eq = d.equipo;
  const hora = Number(d.hora.slice(0, 2));
  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fechaTexto = new Date(`${d.hoy}T12:00:00Z`).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const fechaLarga = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
  const activos = v.activos.local + v.activos.delivery;
  const spark = Array.from({ length: 14 }, (_, i) => { const f = sumarDias(d.hoy, -(13 - i)); const x = v.porDia.find(p => p.fecha === f); return x ? x.local + x.delivery : 0; });
  const colorAviso = { rojo: ROJO, ambar: AMR, info: AZUL };
  const totalCats = enRango.cats.reduce((s, c) => s + c.monto, 0);
  const maxTop = Math.max(...enRango.top.map(t => t.cantidad), 1);
  const ordenEquipo = [...eq.hoy].sort((a, b) => (a.estado === "dentro" ? 0 : a.esperado ? 1 : 2) - (b.estado === "dentro" ? 0 : b.esperado ? 1 : 2));
  const iso = (s: string | null) => (s ? Math.max(0, Math.round((Date.parse(d.ahora) - Date.parse(s)) / 60000)) : null);
  const syncMin = iso(eq.terminal.ultimaSync);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "28px 36px 48px" }}>
      <style>{`@keyframes latido { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(1.5); } }`}</style>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontFamily: TITLE, fontSize: 34, fontWeight: 900 }}>{saludo}{nombre ? `, ${nombre}` : ""}</div>
            <div style={{ fontSize: 18, color: TEXT2 }}>{fechaLarga} · {d.hora}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: TEXT3 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: VERDE, animation: "latido 2s infinite" }} />
            En vivo · actualizado hace {segundos} s
          </div>
        </div>

        {/* Atención: lo primero que hay que mirar */}
        <div style={{ ...tarjeta, borderColor: d.avisos.some(a => a.nivel === "rojo") ? ROJO : d.avisos.length ? AMR : VERDE }}>
          <div style={{ ...tituloSeccion, marginBottom: 10 }}>{d.avisos.length ? `Requiere tu atención (${d.avisos.length})` : "Todo al día"}</div>
          {d.avisos.length === 0 ? (
            <div style={{ color: TEXT2, fontSize: 17 }}>No hay pedidos esperando, reclamos, tareas vencidas ni documentos por vencer. Buen momento para mirar los números.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {d.avisos.slice(0, 8).map((a, i) => (
                <Link key={i} href={a.href} style={{ display: "flex", alignItems: "center", gap: 10, background: SURF2, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${colorAviso[a.nivel]}`, borderRadius: 10, padding: "9px 14px", color: TEXT1, textDecoration: "none", fontSize: 16 }}>
                  {a.texto}<span style={{ color: TEXT3 }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Números grandes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          <KpiGrande titulo="Ventas de hoy" valor={v.hoy} formato={plata} color={AMR} href="/admin/ventas"
            extra={<Sparkline valores={spark} color={AMR} />}
            pie={<><Delta actual={v.hoy} previo={v.mismoDiaSemPasada} etiqueta={`vs ${DIA_LARGO[v.diaSemana] ?? "hoy"} pasado`} /><div style={{ color: TEXT3, marginTop: 2 }}>Local {plata(v.hoyLocal)} · Delivery {plata(v.hoyDelivery)}</div></>} />
          <KpiGrande titulo="Ventas del mes" valor={v.mes} formato={plata} href="/admin/ventas"
            pie={<><Delta actual={v.mes} previo={v.mesAnterior} etiqueta="vs mes anterior a esta fecha" />{v.mejorDia && v.mejorDia.total > 0 && <div style={{ color: TEXT3, marginTop: 2 }}>Mejor día: {plata(v.mejorDia.total)} ({corto(v.mejorDia.fecha)})</div>}</>} />
          <KpiGrande titulo="En cocina y barra ahora" valor={activos} formato={n => String(Math.round(n))} color={v.activos.esperaMaxMin >= 10 ? ROJO : activos > 0 ? AMR : TEXT1} href="/admin/pedidos"
            pie={activos === 0 ? "Sin pedidos en curso" : <>{v.activos.local} en el local · {v.activos.delivery} delivery{v.activos.recibidos > 0 && <div style={{ color: v.activos.esperaMaxMin >= 10 ? ROJO : TEXT3, marginTop: 2 }}>{v.activos.recibidos} sin atender · el más antiguo espera {v.activos.esperaMaxMin} min</div>}</>} />
          <KpiGrande titulo="Equipo en el local" valor={eq.dentro} formato={n => String(Math.round(n))} color={VERDE} href="/admin/asistencia"
            extra={<div style={{ display: "flex" }}>{eq.hoy.filter(p => p.estado === "dentro").slice(0, 5).map((p, i) => (
              <div key={p.id} title={p.nombre} style={{ width: 30, height: 30, borderRadius: 999, background: VERDE, color: "#062018", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i ? -8 : 0, border: `2px solid ${SURFACE}` }}>{iniciales(p.nombre)}</div>
            ))}</div>}
            pie={eq.esperadosHoy > 0 ? `de ${eq.esperadosHoy} que tienen turno hoy` : `de ${eq.total} con control de asistencia`} />
        </div>

        {/* Ventas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
          <div style={{ ...tarjeta, gridColumn: "span 1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <div style={tituloSeccion}>Ventas</div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 6 }}>
                {RANGOS.map(r => (
                  <button key={r.dias} onClick={() => setRango(r.dias)} style={{ background: rango === r.dias ? AMR : SURF2, color: rango === r.dias ? "#1a1200" : TEXT2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{r.label}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 15, color: TEXT2, marginBottom: 8 }}>
              <strong style={{ color: TEXT1, fontSize: 22, fontFamily: TITLE }}>{plata(enRango.total)}</strong> en {enRango.pedidos} pedido{enRango.pedidos === 1 ? "" : "s"}
              {enRango.pedidos > 0 && <> · ticket promedio {plata(enRango.total / enRango.pedidos)}</>}
            </div>
            {enRango.total === 0
              ? <div style={{ color: TEXT3, fontSize: 16, padding: "40px 0" }}>No hubo ventas en este período. Prueba con un rango más largo.</div>
              : <GraficoVentas dias={dias} />}
          </div>

          <div style={tarjeta}>
            <div style={tituloSeccion}>Lo más vendido</div>
            <div style={{ fontSize: 14, color: TEXT3, marginBottom: 14 }}>Últimos {rango === 180 ? "6 meses" : `${rango} días`}, por cantidad de platos</div>
            {enRango.top.length === 0 ? <div style={{ color: TEXT3, fontSize: 16 }}>Sin ventas en este período.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {enRango.top.map((t, i) => <Barra key={t.nombre} etiqueta={`${i + 1}. ${t.nombre}`} valor={t.cantidad} max={maxTop} texto={`${t.cantidad} · ${plata(t.monto)}`} color={i === 0 ? AMR : "#c9a227"} />)}
              </div>
            )}
            {totalCats > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>De dónde viene la plata</div>
                <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden" }}>
                  {enRango.cats.map(c => <div key={c.categoria} title={`${c.categoria}: ${plata(c.monto)}`} style={{ width: `${(c.monto / totalCats) * 100}%`, background: colorCategoria(c.categoria) }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10, fontSize: 14, color: TEXT2 }}>
                  {enRango.cats.map(c => <span key={c.categoria}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: colorCategoria(c.categoria), marginRight: 6 }} />{c.categoria} {Math.round((c.monto / totalCats) * 100)}%</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Equipo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
          <div style={tarjeta}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={tituloSeccion}>Equipo hoy</div>
              <div style={{ flex: 1 }} />
              <Link href="/admin/terminal-zk" style={{ textDecoration: "none" }}>
                <Pastilla color={eq.terminal.conectado ? VERDE : TEXT3}>
                  Terminal {eq.terminal.conectado ? "conectado" : `sin conexión${syncMin != null ? ` · sync hace ${syncMin < 60 ? `${syncMin} min` : `${Math.round(syncMin / 60)} h`}` : ""}`}
                </Pastilla>
              </Link>
            </div>
            {ordenEquipo.length === 0 ? <div style={{ color: TEXT3, fontSize: 16 }}>Aún no hay trabajadores con control de asistencia.</div> : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {ordenEquipo.map((p, i) => (
                  <Link key={p.id} href={`/admin/asistencia/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${BORDER}` : "none", textDecoration: "none", color: TEXT1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 999, background: p.estado === "dentro" ? VERDE : SURF2, color: p.estado === "dentro" ? "#062018" : TEXT2, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{iniciales(p.nombre)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primerNombre(p.nombre)} {p.nombre.split(" ").slice(-1)[0]}</div>
                      <div style={{ fontSize: 13, color: TEXT3 }}>{p.cargo}</div>
                    </div>
                    {p.estado === "dentro" && <Pastilla color={p.tarde ? AMR : VERDE}>{p.tarde ? "Llegó tarde" : "En el local"} · {p.desde}</Pastilla>}
                    {p.estado === "salio" && <Pastilla color={TEXT3}>Salió</Pastilla>}
                    {p.estado === "sin_marcar" && (p.ausente ? <Pastilla color={ROJO}>No ha marcado</Pastilla> : p.esperado ? <Pastilla color={AMR}>Aún no llega</Pastilla> : <Pastilla color={TEXT3}>Sin turno hoy</Pastilla>)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={tarjeta}>
              <div style={{ ...tituloSeccion, marginBottom: 12 }}>Últimos 7 días del equipo</div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><div style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: AMR }}>{fmtHoras(eq.semana.horasMin)}</div><div style={{ fontSize: 14, color: TEXT3 }}>horas trabajadas</div></div>
                <div><div style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: eq.semana.puntualidad == null ? TEXT3 : eq.semana.puntualidad >= 90 ? VERDE : eq.semana.puntualidad >= 75 ? AMR : ROJO }}>{eq.semana.puntualidad == null ? "—" : `${eq.semana.puntualidad}%`}</div><div style={{ fontSize: 14, color: TEXT3 }}>puntualidad</div></div>
                <div><div style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900 }}>{eq.semana.diasConMarcas}</div><div style={{ fontSize: 14, color: TEXT3 }}>días con marcaciones</div></div>
              </div>
              {eq.semana.horasMin === 0 && <div style={{ fontSize: 14, color: TEXT3, marginTop: 10 }}>Todavía no hay marcaciones esta semana. Se llenan al descargar los datos del terminal.</div>}
            </div>

            <div style={tarjeta}>
              <div style={{ ...tituloSeccion, marginBottom: 12 }}>Personas y documentos</div>
              {d.trabajadores.porVencer.length === 0
                ? <div style={{ color: TEXT2, fontSize: 15 }}>Sin permisos ni cursos por vencer en los próximos 90 días.</div>
                : d.trabajadores.porVencer.slice(0, 4).map(x => (
                  <Link key={x.empleado_id + x.tipo} href={`/admin/trabajadores/${x.empleado_id}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", textDecoration: "none", color: TEXT1, fontSize: 15 }}>
                    <span>{primerNombre(x.nombre)} · {x.tipo}</span>
                    <Pastilla color={x.dias < 0 ? ROJO : x.dias <= 30 ? AMR : TEXT3}>{x.dias < 0 ? `venció hace ${-x.dias} d` : `en ${x.dias} d`}</Pastilla>
                  </Link>
                ))}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <Link href="/admin/trabajadores" style={{ textDecoration: "none" }}><Pastilla color={d.trabajadores.contratosPendientes ? AMR : TEXT3}>{d.trabajadores.contratosPendientes} contratos por completar</Pastilla></Link>
                <Link href="/admin/trabajadores" style={{ textDecoration: "none" }}><Pastilla color={TEXT3}>{d.trabajadores.sinFicha} sin ficha</Pastilla></Link>
              </div>
            </div>
          </div>
        </div>

        {/* Eventos y pendientes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
          <div style={tarjeta}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={tituloSeccion}>Eventos</div><div style={{ flex: 1 }} />
              <Link href="/admin/eventos" style={{ color: AMR, fontSize: 14, textDecoration: "none", fontWeight: 700 }}>Ver todos →</Link>
            </div>
            {d.eventos.length === 0 ? <div style={{ color: TEXT3, fontSize: 16 }}>No hay eventos publicados.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {d.eventos.slice(0, 5).map(e => (
                  <Barra key={e.id} etiqueta={`${e.emoji} ${e.titulo}`} valor={e.registrados} max={e.cupos || 1}
                    texto={e.cupos ? `${e.registrados}/${e.cupos} cupos` : `${e.registrados} inscritos`}
                    color={e.cupos && e.registrados / e.cupos >= 0.9 ? ROJO : e.cupos && e.registrados / e.cupos >= 0.6 ? AMR : VERDE}
                    nota={e.porConfirmar > 0 ? `${e.porConfirmar} inscripción${e.porConfirmar > 1 ? "es" : ""} por confirmar` : undefined} />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
            {[
              { t: "Reclamos nuevos", n: d.pendientes.reclamos, href: "/admin/reclamos", c: d.pendientes.reclamos ? AMR : TEXT1, s: "de clientes" },
              { t: "Denuncias nuevas", n: d.pendientes.denuncias, href: "/admin/denuncias", c: d.pendientes.denuncias ? ROJO : TEXT1, s: "del equipo" },
              { t: "Tareas abiertas", n: d.pendientes.tareas, href: "/admin/tareas", c: d.pendientes.tareasVencidas ? AMR : TEXT1, s: d.pendientes.tareasVencidas ? `${d.pendientes.tareasVencidas} vencidas` : `${d.pendientes.tareasUrgentes} urgentes` },
              { t: "Presupuestos enviados", n: d.presupuestos.enviados, href: "/admin/presupuestos", c: TEXT1, s: d.presupuestos.enviados ? `${plata(d.presupuestos.monto)} en juego` : `${d.presupuestos.aceptados} aceptados` },
            ].map(x => (
              <Link key={x.t} href={x.href} style={{ ...tarjeta, textDecoration: "none", color: TEXT1, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{x.t}</div>
                <div style={{ fontFamily: TITLE, fontSize: 34, fontWeight: 900, color: x.c }}>{x.n}</div>
                <div style={{ fontSize: 14, color: TEXT3 }}>{x.s}</div>
              </Link>
            ))}
            <div style={{ ...tarjeta, gridColumn: "span 2", padding: 16, display: "flex", gap: 24, flexWrap: "wrap", fontSize: 15, color: TEXT2 }}>
              <span><strong style={{ color: TEXT1 }}>{d.carta.productos}</strong> productos en la carta{d.carta.agotados > 0 && <> · <span style={{ color: AMR }}>{d.carta.agotados} agotados</span></>}</span>
              <span>Ticket promedio 30 días: <strong style={{ color: TEXT1 }}>{plata(v.ticket30)}</strong></span>
              <span>{v.pedidos30} pedidos en 30 días</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
