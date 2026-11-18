"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, ExternalLink, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useAdminNav } from "../AdminNavProvider";
import { puede, type Accion } from "../../../../lib/permisos";
import {
  DESCRIPCION_MAX, NOMBRE_MAX, NOTA_MAX, PLATOS_MAX,
  borradorVacio, etiquetaDia, hoyChile, platosLimpios, precioTexto, sumarDias, validarMenu,
  type BorradorMenu, type MenuDia, type PlatoMenu,
} from "../../../../lib/menu-dia";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px",
  color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", maxWidth: "100%", boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, padding: "10px 16px",
  fontSize: 15, fontWeight: 800, fontFamily: FONT, border: "none", cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
};
const btnSec: React.CSSProperties = { ...btnBase, background: SURF2, color: TEXT1, border: `1px solid ${BORDER}`, fontWeight: 700 };
const iconBtn: React.CSSProperties = { ...btnSec, padding: "7px 9px" };

type Editor = { id: string | null; borrador: BorradorMenu };
type Lamina = "historia" | "portada" | number;

const platoVacio = (): PlatoMenu => ({ nombre: "", descripcion: "", precio: null });
const aBorrador = (m: MenuDia): BorradorMenu => ({ fecha: m.fecha, horaDesde: m.horaDesde, nota: m.nota, publicado: m.publicado, platos: m.platos.length ? m.platos : [platoVacio()] });
const cuerpoLamina = (l: Lamina) => (typeof l === "number" ? { plato: l } : l);

export default function MenuDiaPage() {
  const { rol, permisos } = useAdminNav();
  const puedo = (a: Accion) => puede(rol, permisos, "menu", a);

  const [menus, setMenus] = useState<MenuDia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verPasados, setVerPasados] = useState(false);

  const [lamina, setLamina] = useState<Lamina>("historia");
  const [previa, setPrevia] = useState<{ url: string | null; cargando: boolean; error: string | null }>({ url: null, cargando: false, error: null });
  const [descargando, setDescargando] = useState<string | null>(null);
  const solicitud = useRef(0);

  const hoy = hoyChile();

  async function cargar() {
    const res = await fetch("/api/menu-dia");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "No se pudieron cargar los menús"); setCargando(false); return; }
    setMenus(data);
    setCargando(false);
  }
  useEffect(() => { (async () => { await cargar(); })(); }, []);

  const proximos = useMemo(() => menus.filter(m => m.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)), [menus, hoy]);
  const pasados = useMemo(() => menus.filter(m => m.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha)), [menus, hoy]);

  function fechaLibre(desde: string = hoy) {
    const usadas = new Set(menus.map(m => m.fecha));
    let f = desde;
    while (usadas.has(f)) f = sumarDias(f, 1);
    return f;
  }

  const b = editor?.borrador ?? null;
  const limpios = useMemo(() => (b ? platosLimpios(b.platos) : []), [b]);
  const fechaOcupada = !!b && menus.some(m => m.fecha === b.fecha && m.id !== editor?.id);
  const validacion = b ? validarMenu(b) : null;
  const dia = b ? etiquetaDia(b.fecha) : null;

  const cambiar = (parcial: Partial<BorradorMenu>) => setEditor(e => (e ? { ...e, borrador: { ...e.borrador, ...parcial } } : e));
  const cambiarPlato = (i: number, parcial: Partial<PlatoMenu>) =>
    setEditor(e => (e ? { ...e, borrador: { ...e.borrador, platos: e.borrador.platos.map((p, j) => (j === i ? { ...p, ...parcial } : p)) } } : e));
  const moverPlato = (i: number, delta: number) =>
    setEditor(e => {
      if (!e) return e;
      const platos = [...e.borrador.platos];
      const j = i + delta;
      if (j < 0 || j >= platos.length) return e;
      [platos[i], platos[j]] = [platos[j], platos[i]];
      return { ...e, borrador: { ...e.borrador, platos } };
    });
  const quitarPlato = (i: number) =>
    setEditor(e => (e ? { ...e, borrador: { ...e.borrador, platos: e.borrador.platos.length > 1 ? e.borrador.platos.filter((_, j) => j !== i) : [platoVacio()] } } : e));

  function abrir(e: Editor) {
    setEditor(e); setLamina("historia"); setError(null); setAviso(null);
  }

  // La vista previa se pide al servidor (el mismo dibujo que se descarga), con una pausa para no pedirla en cada tecla.
  const firma = b ? JSON.stringify([b, typeof lamina === "number" ? Math.min(lamina, Math.max(limpios.length, 1)) : lamina]) : "";
  useEffect(() => {
    if (!b) return;
    const ok = validarMenu(b);
    const id = ++solicitud.current;
    if (!ok.ok) {
      const t = setTimeout(() => { if (id === solicitud.current) setPrevia({ url: null, cargando: false, error: ok.error }); }, 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(async () => {
      setPrevia(p => ({ ...p, cargando: true, error: null }));
      try {
        const l = typeof lamina === "number" ? Math.min(lamina, ok.datos.platos.length) : lamina;
        const res = await fetch("/api/menu-dia/render", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menu: b, lamina: cuerpoLamina(l) }),
        });
        if (id !== solicitud.current) return;
        if (!res.ok) { setPrevia({ url: null, cargando: false, error: (await res.json().catch(() => ({}))).error || "No se pudo dibujar la vista previa" }); return; }
        const url = URL.createObjectURL(await res.blob());
        setPrevia(p => { if (p.url) URL.revokeObjectURL(p.url); return { url, cargando: false, error: null }; });
      } catch {
        if (id === solicitud.current) setPrevia({ url: null, cargando: false, error: "No se pudo dibujar la vista previa" });
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `firma` resume `b` y `lamina`.
  }, [firma]);

  async function guardar() {
    if (!editor || !validacion?.ok) return;
    setError(null); setAviso(null); setGuardando(true);
    const nuevo = editor.id === null;
    const res = await fetch(nuevo ? "/api/menu-dia" : `/api/menu-dia/${editor.id}`, {
      method: nuevo ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor.borrador),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) { setError(data.error || "No se pudo guardar el menú"); return; }
    const guardado = data as MenuDia;
    setMenus(prev => (nuevo ? [guardado, ...prev] : prev.map(m => (m.id === guardado.id ? guardado : m))));
    setEditor({ id: guardado.id, borrador: aBorrador(guardado) });
    setAviso(guardado.publicado ? "Menú guardado y publicado en la web." : "Menú guardado como borrador (no se ve en la web).");
  }

  async function eliminar() {
    if (!editor?.id) return;
    if (!confirm(`¿Eliminar el menú del ${dia?.dia.toLowerCase()} ${dia?.fecha}? No se puede deshacer.`)) return;
    const res = await fetch(`/api/menu-dia/${editor.id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo eliminar"); return; }
    setMenus(prev => prev.filter(m => m.id !== editor.id));
    setEditor(null); setAviso("Menú eliminado.");
  }

  async function descargar(clave: string, l: Lamina | "zip") {
    if (!b || !validacion?.ok) return;
    setDescargando(clave); setError(null);
    try {
      const res = await fetch("/api/menu-dia/render", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: b, lamina: l === "zip" ? "zip" : cuerpoLamina(l), descargar: true }),
      });
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo descargar"); return; }
      const nombre = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "menu.jpg";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setDescargando(null);
    }
  }

  const fila = (m: MenuDia) => {
    const d = etiquetaDia(m.fecha);
    const activo = editor?.id === m.id;
    return (
      <button key={m.id} type="button" onClick={() => abrir({ id: m.id, borrador: aBorrador(m) })}
        style={{ ...btnSec, width: "100%", justifyContent: "space-between", textAlign: "left", background: activo ? "#3a2f10" : SURF2, border: `1px solid ${activo ? AMR : BORDER}`, padding: "10px 14px" }}>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: TITLE, fontSize: 17, fontWeight: 900, color: activo ? AMR : TEXT1 }}>
            {d.corta}{m.fecha === hoy ? " · Hoy" : ""}
          </span>
          <span style={{ fontSize: 13, color: TEXT3, fontWeight: 500 }}>{platosLimpios(m.platos).length === 1 ? "1 plato" : `${platosLimpios(m.platos).length} platos`} · desde las {m.horaDesde}</span>
        </span>
        <span style={{ background: m.publicado ? "#1a2e1a" : "#2a2622", color: m.publicado ? VERDE : TEXT3, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>
          {m.publicado ? "Publicado" : "Borrador"}
        </span>
      </button>
    );
  };

  const laminas: { clave: Lamina; texto: string }[] = [
    { clave: "historia", texto: "Historia" },
    { clave: "portada", texto: "Portada" },
    ...limpios.map((_, i) => ({ clave: (i + 1) as Lamina, texto: `Plato ${i + 1}` })),
  ];
  const laminaActiva: Lamina = typeof lamina === "number" ? Math.min(lamina, Math.max(limpios.length, 1)) : lamina;

  return (
    <div className="adm-page" style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div className="adm-h1" style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900, display: "flex", alignItems: "center", gap: 12 }}><UtensilsCrossed size={30} color={AMR} /> Menú del día</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Arma el menú del chef para cada día, publícalo en la web y descarga las gráficas para redes: historia y carrusel.</div>
        </div>

        {aviso && <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", color: VERDE, borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{aviso}</div>}
        {error && <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{error}</div>}

        <div className="adm-grid-1" style={{ display: "grid", gridTemplateColumns: "minmax(0, 300px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>

          {/* ── Lista de días ── */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {puedo("c") && (
              <button type="button" onClick={() => abrir({ id: null, borrador: borradorVacio(fechaLibre()) })} style={{ ...btnBase, background: AMR, color: "#1a1200" }}>
                <Plus size={18} /> Nuevo menú
              </button>
            )}

            {cargando ? <div style={{ color: TEXT3 }}>Cargando…</div> : (
              <>
                <div style={{ ...label, marginTop: 6, marginBottom: 0 }}>Hoy y próximos días</div>
                {proximos.length === 0 ? <div style={{ color: TEXT3, fontSize: 14 }}>No hay menús para hoy ni para los próximos días.</div> : proximos.map(fila)}

                {pasados.length > 0 && (
                  <>
                    <button type="button" onClick={() => setVerPasados(v => !v)} style={{ ...label, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, marginTop: 10, marginBottom: 0, fontFamily: FONT }}>
                      {verPasados ? "▾" : "▸"} Anteriores ({pasados.length})
                    </button>
                    {verPasados && pasados.slice(0, 30).map(fila)}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Editor y vista previa ── */}
          {!editor || !b ? (
            <div style={{ background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: 16, padding: 40, color: TEXT3, textAlign: "center", fontSize: 16 }}>
              Elige un día de la lista o crea un menú nuevo.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
              <fieldset disabled={editor.id ? !puedo("u") : !puedo("c")} style={{ border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 16, padding: 20, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900 }}>
                  {dia?.dia ? `${dia.dia} ${dia.fecha}` : "Menú"} {editor.id === null && <span style={{ fontSize: 14, color: TEXT3, fontWeight: 700 }}>· nuevo</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
                  <div>
                    <div style={label}>Fecha</div>
                    <input type="date" value={b.fecha} onChange={e => cambiar({ fecha: e.target.value })} style={inputBase} />
                    {fechaOcupada && <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 5 }}>Ya existe un menú para ese día.</div>}
                  </div>
                  <div>
                    <div style={label}>Desde las</div>
                    <input type="time" value={b.horaDesde} onChange={e => cambiar({ horaDesde: e.target.value })} style={inputBase} />
                  </div>
                </div>

                <div>
                  <div style={{ ...label, display: "flex", justifyContent: "space-between" }}><span>Nota al pie (opcional)</span><span style={{ fontWeight: 500 }}>{b.nota.length}/{NOTA_MAX}</span></div>
                  <input value={b.nota} maxLength={NOTA_MAX} onChange={e => cambiar({ nota: e.target.value })} placeholder="Disponible también nuestra carta" style={inputBase} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ ...label, marginBottom: 0 }}>Platos ({b.platos.length}/{PLATOS_MAX})</div>
                  {b.platos.map((p, i) => (
                    <div key={i} style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontFamily: TITLE, fontSize: 16, fontWeight: 900, color: AMR }}>Plato {i + 1}</span>
                        <span style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => moverPlato(i, -1)} disabled={i === 0} aria-label={`Subir plato ${i + 1}`} style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }}><ArrowUp size={16} /></button>
                          <button type="button" onClick={() => moverPlato(i, 1)} disabled={i === b.platos.length - 1} aria-label={`Bajar plato ${i + 1}`} style={{ ...iconBtn, opacity: i === b.platos.length - 1 ? 0.4 : 1 }}><ArrowDown size={16} /></button>
                          <button type="button" onClick={() => quitarPlato(i)} aria-label={`Quitar plato ${i + 1}`} style={{ ...iconBtn, color: "#fca5a5" }}><Trash2 size={16} /></button>
                        </span>
                      </div>
                      <div>
                        <div style={{ ...label, display: "flex", justifyContent: "space-between" }}><span>Título del plato (corto)</span><span style={{ fontWeight: 500 }}>{p.nombre.length}/{NOMBRE_MAX}</span></div>
                        <input value={p.nombre} maxLength={NOMBRE_MAX} onChange={e => cambiarPlato(i, { nombre: e.target.value })} placeholder="Ej: Fetuccini al pil pil" style={inputBase} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                        <div>
                          <div style={label}>Acompañado de (opcional)</div>
                          <input value={p.descripcion} maxLength={DESCRIPCION_MAX} onChange={e => cambiarPlato(i, { descripcion: e.target.value })} placeholder="Ej: Acompañado de camarones al ajillo" style={inputBase} />
                        </div>
                        <div>
                          <div style={label}>Precio (opcional)</div>
                          <div style={{ position: "relative" }}>
                            <input type="number" inputMode="numeric" min={0} step={100} value={p.precio ?? ""} onChange={e => cambiarPlato(i, { precio: e.target.value === "" ? null : Number(e.target.value) })} placeholder="8900" style={{ ...inputBase, paddingRight: 34 }} />
                            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontWeight: 700 }}>$</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditor(e => (e ? { ...e, borrador: { ...e.borrador, platos: [...e.borrador.platos, platoVacio()] } } : e))} disabled={b.platos.length >= PLATOS_MAX}
                    style={{ ...btnSec, alignSelf: "flex-start", opacity: b.platos.length >= PLATOS_MAX ? 0.5 : 1 }}>
                    <Plus size={16} /> Agregar plato
                  </button>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 12, background: SURF2, border: `1px solid ${b.publicado ? "#2d5a2d" : BORDER}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer" }}>
                  <input type="checkbox" checked={b.publicado} onChange={e => cambiar({ publicado: e.target.checked })} style={{ width: 20, height: 20, accentColor: AMR }} />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>Publicar en la web</span>
                    <span style={{ fontSize: 13, color: TEXT3 }}>Se ve en cachocabrabar.cl/menu-del-dia: el de hoy arriba y los próximos días debajo. Sin publicar queda como borrador.</span>
                  </span>
                </label>

                {validacion && !validacion.ok && <div style={{ fontSize: 14, color: "#fca5a5" }}>{validacion.error}</div>}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button type="button" onClick={guardar} disabled={!validacion?.ok || fechaOcupada || guardando}
                    style={{ ...btnBase, background: AMR, color: "#1a1200", fontSize: 17, padding: "13px 22px", opacity: !validacion?.ok || fechaOcupada || guardando ? 0.5 : 1, cursor: !validacion?.ok || fechaOcupada || guardando ? "not-allowed" : "pointer" }}>
                    {guardando ? "Guardando…" : editor.id ? "Guardar cambios" : "Guardar menú"}
                  </button>
                  {editor.id && puedo("c") && (
                    <button type="button" onClick={() => abrir({ id: null, borrador: { ...b, fecha: fechaLibre(sumarDias(b.fecha, 1) < hoy ? hoy : sumarDias(b.fecha, 1)), publicado: false } })} style={btnSec}>
                      <Copy size={16} /> Duplicar a otro día
                    </button>
                  )}
                  {editor.id && b.publicado && (
                    <a href="/menu-del-dia" target="_blank" rel="noopener noreferrer" style={btnSec}><ExternalLink size={16} /> Ver en la web</a>
                  )}
                  {editor.id && puedo("d") && <button type="button" onClick={eliminar} style={{ ...btnSec, color: "#fca5a5" }}><Trash2 size={16} /> Eliminar</button>}
                </div>
                {editor.id === null && <div style={{ fontSize: 13, color: TEXT3 }}>Puedes ver y descargar las gráficas antes de guardar.</div>}
              </fieldset>

              {/* ── Vista previa y descargas ── */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Gráficas para redes</div>
                  <div style={{ fontSize: 15, color: TEXT3 }}>Historia 1080 × 1920 y carrusel 1080 × 1350 (portada + una lámina por plato, con el título grande). Se actualizan mientras escribes.</div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {laminas.map(l => (
                    <button key={String(l.clave)} type="button" onClick={() => setLamina(l.clave)}
                      style={{ ...btnSec, padding: "6px 14px", fontSize: 14, borderRadius: 999, background: laminaActiva === l.clave ? "#3a2f10" : SURF2, color: laminaActiva === l.clave ? AMR : TEXT2, border: `1px solid ${laminaActiva === l.clave ? AMR : BORDER}` }}>
                      {l.texto}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
                  <div style={{ position: "relative", width: laminaActiva === "historia" ? 270 : 340, maxWidth: "100%", aspectRatio: laminaActiva === "historia" ? "1080 / 1920" : "1080 / 1350", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    {previa.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previa.url} alt="Vista previa de la gráfica" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", opacity: previa.cargando ? 0.45 : 1, transition: "opacity 0.2s" }} />
                    )}
                    {previa.cargando && <div style={{ position: "absolute", right: 10, top: 10, background: "rgba(0,0,0,0.65)", color: TEXT1, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>Actualizando…</div>}
                    {previa.error && !previa.cargando && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT3, fontSize: 14, padding: 16, textAlign: "center" }}>{previa.error}</div>}
                  </div>

                  <div style={{ flex: 1, minWidth: 230, display: "flex", flexDirection: "column", gap: 10 }}>
                    <button type="button" disabled={!validacion?.ok || descargando !== null} onClick={() => descargar("historia", "historia")} style={{ ...btnBase, background: AMR, color: "#1a1200", opacity: !validacion?.ok ? 0.5 : 1 }}>
                      <Download size={16} /> {descargando === "historia" ? "Preparando…" : "Historia · JPG"}
                    </button>
                    <button type="button" disabled={!validacion?.ok || descargando !== null} onClick={() => descargar("zip", "zip")} style={{ ...btnBase, background: AMR, color: "#1a1200", opacity: !validacion?.ok ? 0.5 : 1 }}>
                      <Download size={16} /> {descargando === "zip" ? "Preparando…" : `Todo en un ZIP · historia + carrusel de ${limpios.length + 1} láminas`}
                    </button>
                    <button type="button" disabled={!validacion?.ok || descargando !== null} onClick={() => descargar("actual", laminaActiva)} style={btnSec}>
                      <Download size={16} /> {descargando === "actual" ? "Preparando…" : `Solo esta lámina (${laminaActiva === "historia" ? "historia" : laminaActiva === "portada" ? "portada" : `plato ${laminaActiva}`}) · JPG`}
                    </button>
                    <div style={{ fontSize: 14, color: TEXT3, lineHeight: 1.5, marginTop: 4 }}>
                      El ZIP trae la historia y el carrusel numerado en orden (portada, plato 1, plato 2…), listo para subir a Instagram.
                      {limpios.length > 0 && <> Precios: {limpios.map(p => (p.precio != null ? precioTexto(p.precio) : "sin precio")).join(" · ")}.</>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
