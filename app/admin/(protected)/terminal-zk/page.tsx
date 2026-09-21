"use client";
import { useCallback, useEffect, useState } from "react";
import { BG, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, AZUL, FONT, TITLE } from "../../../../lib/tokens";
import { LATIDO_VIGENCIA_S, nombreParaTerminal, type Comando, type EstadoTerminal, type TipoComando } from "../../../../lib/terminal";
import { Kpi, tarjeta } from "../asistencia/graficos";

interface Empleado { id: string; nombre: string; cargo: string | null; zk_id: number | null; control_asistencia: boolean }
interface Datos { estado: EstadoTerminal | null; comandos: Comando[]; empleados: Empleado[]; ahora: string }

const NOMBRE_COMANDO: Record<TipoComando, string> = {
  sincronizar_usuarios: "Cargar trabajadores", ajustar_hora: "Ajustar hora", iniciar_huella: "Registrar huella",
  borrar_usuario: "Borrar del terminal", descargar_marcaciones: "Descargar marcaciones",
};

const ms = (s: string) => Date.parse(s.replace(" ", "T") + (s.includes("Z") || s.includes("+") ? "" : "Z"));
const horaChile = () => new Date().toLocaleString("sv-SE", { timeZone: "America/Santiago" });

function hace(iso: string | null, ahora: string) {
  if (!iso) return "nunca";
  const s = Math.max(0, Math.round((Date.parse(ahora) - Date.parse(iso)) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} días`;
}

export default function TerminalZkPage() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/terminal");
    if (res.ok) { setDatos(await res.json()); setError(""); }
    else setError((await res.json().catch(() => ({}))).error ?? "No se pudo cargar");
  }, []);

  useEffect(() => {
    (async () => { await cargar(); })();
    const t = setInterval(() => { cargar(); setTick(x => x + 1); }, 4000);
    return () => clearInterval(t);
  }, [cargar]);

  async function ordenar(body: Record<string, unknown>, texto: string) {
    setAviso(null);
    const res = await fetch("/api/terminal/comandos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setAviso(res.ok ? { ok: true, texto: `${texto} Queda en cola y se ejecuta en unos segundos.` } : { ok: false, texto: d.error });
    await cargar();
  }

  if (!datos) {
    return <div style={{ minHeight: "100vh", background: BG, color: error ? ROJO : TEXT3, fontFamily: FONT, padding: 40 }}>{error || "Cargando…"}</div>;
  }

  const { estado, comandos, empleados, ahora } = datos;
  const latidoS = estado?.ultimo_latido ? (Date.parse(ahora) - Date.parse(estado.ultimo_latido)) / 1000 : Infinity;
  const puenteVivo = latidoS < LATIDO_VIGENCIA_S;
  const conectado = puenteVivo && estado?.terminal_ok === true;

  const [color, titulo, detalle] = conectado
    ? [VERDE, "Conectado", "El terminal está respondiendo."]
    : puenteVivo
      ? [AMR, "No se encuentra el terminal", estado?.mensaje ?? "Revisa que esté encendido y con el cable de red."]
      : [TEXT3, "Sin conexión con el terminal por ahora", "Para usar estas opciones, conecta el terminal por cable de red y enciende el programa de conexión. Mientras tanto, puedes subir el archivo del pendrive en Asistencia."];

  const diffMin = conectado && estado?.hora_terminal ? Math.round((ms(estado.hora_terminal) - ms(horaChile())) / 60000) : null;
  const horaMala = diffMin != null && Math.abs(diffMin) > 2;
  const enCurso = comandos.filter(c => c.estado === "pendiente" || c.estado === "en_proceso");
  const ocupado = (t: TipoComando) => enCurso.some(c => c.tipo === t);
  const usuarios = new Map((estado?.usuarios_detalle ?? []).map(u => [u.user_id, u]));
  const faltan = empleados.filter(e => e.control_asistencia && !(e.zk_id != null && usuarios.has(String(e.zk_id))));
  void tick;

  const boton = (activo: boolean, principal = false): React.CSSProperties => ({
    background: principal ? AMR : SURF2, color: principal ? "#1a1200" : TEXT2, border: principal ? "none" : `1px solid ${BORDER}`,
    borderRadius: 8, padding: "10px 18px", fontSize: 16, fontWeight: 700, cursor: activo ? "pointer" : "not-allowed",
    fontFamily: FONT, opacity: activo ? 1 : 0.5,
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Configuración del terminal ZK</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Controla el terminal de huellas a distancia. Se actualiza solo cada pocos segundos.</div>
        </div>

        <div style={{ ...tarjeta, borderColor: color, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color }}>{titulo}</div>
            <div style={{ fontSize: 16, color: TEXT2 }}>{detalle}</div>
          </div>
          {estado?.ip && <div style={{ fontSize: 15, color: TEXT3, textAlign: "right" }}>IP {estado.ip}<br />Serie {estado.serie}<br />Firmware {estado.firmware}</div>}
        </div>

        {!conectado && (
          <div style={tarjeta}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Cómo conectar el terminal</div>
            <ol style={{ margin: 0, paddingLeft: 22, color: TEXT2, fontSize: 17, lineHeight: 1.7 }}>
              <li>Conecta el terminal por cable de red al router, y tu computador a esa misma red.</li>
              <li>Descarga el programa de conexión (botón de abajo).</li>
              <li>Ábrelo: en Mac, descomprime el ZIP y haz clic derecho sobre <strong>Conectar terminal</strong> → <strong>Abrir</strong> (la primera vez). Deja la ventana abierta.</li>
              <li>En unos segundos esta pantalla dirá <strong style={{ color: VERDE }}>Conectado</strong>. Al terminar, cierra esa ventana.</li>
            </ol>
            <a href="/api/terminal/programa" download style={{ ...boton(true, true), display: "inline-block", marginTop: 16, textDecoration: "none" }}>
              Descargar programa de conexión
            </a>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Kpi etiqueta="Trabajadores en el terminal" valor={conectado ? String(estado?.usuarios ?? 0) : "—"} nota="cargados en su memoria" />
          <Kpi etiqueta="Marcaciones guardadas" valor={conectado ? String(estado?.marcaciones ?? 0) : "—"} nota={`Última sincronización: ${hace(estado?.ultima_sync ?? null, ahora)}`} />
          <Kpi etiqueta="Hora del terminal" valor={conectado && estado?.hora_terminal ? estado.hora_terminal.slice(11, 16) : "—"}
            color={horaMala ? ROJO : TEXT1} nota={horaMala ? `Desfasada ${Math.abs(diffMin!)} min respecto a Chile. Ajústala.` : conectado ? "Coincide con la hora de Chile" : undefined} />
        </div>

        <div style={tarjeta}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Acciones</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button disabled={ocupado("ajustar_hora")} onClick={() => ordenar({ tipo: "ajustar_hora" }, "Ajuste de hora enviado.")} style={boton(!ocupado("ajustar_hora"), horaMala)}>Ajustar hora a Chile</button>
            <button disabled={ocupado("descargar_marcaciones")} onClick={() => ordenar({ tipo: "descargar_marcaciones" }, "Descarga de marcaciones enviada.")} style={boton(!ocupado("descargar_marcaciones"))}>Descargar marcaciones ahora</button>
          </div>
          {aviso && <div style={{ marginTop: 12, fontSize: 16, color: aviso.ok ? VERDE : ROJO }}>{aviso.texto}</div>}
        </div>

        <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 6px" }}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Trabajadores en el terminal</div>
            <div style={{ fontSize: 15, color: TEXT3 }}>
              Marca a quienes quieras subir al terminal (nuevos o con datos cambiados) y pulsa <strong>Cargar seleccionados</strong>. Con <strong>Registrar huella</strong>, el terminal pide poner el dedo tres veces; la persona debe estar frente al equipo.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <button disabled={sel.size === 0 || ocupado("sincronizar_usuarios")}
                onClick={async () => { await ordenar({ tipo: "sincronizar_usuarios", empleado_ids: [...sel] }, `Carga de ${sel.size} trabajador${sel.size > 1 ? "es" : ""} enviada.`); setSel(new Set()); }}
                style={boton(sel.size > 0 && !ocupado("sincronizar_usuarios"), true)}>Cargar seleccionados ({sel.size})</button>
              <button onClick={() => setSel(new Set(faltan.map(e => e.id)))} disabled={faltan.length === 0} style={boton(faltan.length > 0)}>Marcar los que faltan ({faltan.length})</button>
              <button onClick={() => setSel(new Set())} disabled={sel.size === 0} style={boton(sel.size > 0)}>Quitar selección</button>
            </div>
          </div>
          {empleados.map(e => {
            const u = e.zk_id != null ? usuarios.get(String(e.zk_id)) : undefined;
            const puedeHuella = conectado && !!u && !ocupado("iniciar_huella");
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                <input type="checkbox" checked={sel.has(e.id)} aria-label={`Seleccionar a ${e.nombre}`}
                  onChange={() => setSel(prev => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })}
                  style={{ width: 22, height: 22, accentColor: AMR, cursor: "pointer", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{e.nombre}</div>
                  <div style={{ fontSize: 14, color: TEXT3 }}>
                    {e.cargo} · ID terminal: {e.zk_id ?? "sin asignar"}{!e.control_asistencia && " · no necesita registrar"}
                  </div>
                  {u && u.name.trim() !== nombreParaTerminal(e.nombre) && (
                    <div style={{ fontSize: 13, color: AMR }}>En el terminal figura como «{u.name}». Márcalo y cárgalo para actualizarlo.</div>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: u ? VERDE : TEXT3, border: `1px solid ${u ? VERDE : BORDER}`, borderRadius: 999, padding: "3px 12px" }}>
                  {u ? "En el terminal" : "No cargado"}
                </span>
                <span style={{ fontSize: 15, color: !u ? TEXT3 : u.huellas > 0 ? VERDE : AMR, width: 110 }}>
                  {!u ? "" : u.huellas > 0 ? `${u.huellas} huella${u.huellas > 1 ? "s" : ""}` : "sin huella"}
                </span>
                <button disabled={!puedeHuella} title={u ? "" : "Primero carga los trabajadores"}
                  onClick={() => ordenar({ tipo: "iniciar_huella", empleado_id: e.id, dedo: Math.min(u?.huellas ?? 0, 9) }, `Registro de huella de ${e.nombre.split(" ")[0]} iniciado: mira la pantalla del terminal.`)}
                  style={boton(puedeHuella)}>Registrar huella</button>
                <button disabled={!conectado || !u || ocupado("borrar_usuario")}
                  onClick={() => confirm(`¿Borrar a ${e.nombre} del terminal? Se pierden sus huellas allí.`) && ordenar({ tipo: "borrar_usuario", empleado_id: e.id }, "Borrado enviado.")}
                  style={{ ...boton(conectado && !!u && !ocupado("borrar_usuario")), color: ROJO }}>Borrar</button>
              </div>
            );
          })}
        </div>

        <div style={tarjeta}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Historial de órdenes</div>
          {comandos.length === 0 && <div style={{ color: TEXT3, fontSize: 16 }}>Aún no has enviado órdenes.</div>}
          {comandos.map(c => {
            const [col, txt] = c.estado === "ok" ? [VERDE, "Listo"] : c.estado === "error" ? [ROJO, "Error"] : c.estado === "en_proceso" ? [AZUL, "Ejecutando"] : [AMR, "En cola"];
            const quien = typeof c.payload?.nombre === "string" ? ` · ${c.payload.nombre}` : "";
            return (
              <div key={c.id} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "8px 0", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                <div style={{ width: 70, fontSize: 14, color: TEXT3 }}>{new Date(c.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div>
                <div style={{ fontWeight: 700, fontSize: 16, minWidth: 220 }}>{NOMBRE_COMANDO[c.tipo]}{quien}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: col, border: `1px solid ${col}`, borderRadius: 999, padding: "2px 10px" }}>{txt}</span>
                <div style={{ flex: 1, minWidth: 200, fontSize: 15, color: TEXT2 }}>{c.resultado}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
