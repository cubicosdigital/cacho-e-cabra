"use client";
import { useEffect, useState } from "react";
import type { Evento, TipoEvento, EstadoEvento } from "../../../../lib/eventos";
import SelectorFoto from "../SelectorFoto";
import { resolverImagen } from "../../../../lib/imagenes";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const TIPOS: TipoEvento[] = ["cocina", "cena", "fiesta", "aniversario", "privado"];
const ESTADOS: EstadoEvento[] = ["abierto", "privado", "invitacion"];

function fmt(n: number) { return n === 0 ? "Liberado" : `$${n.toLocaleString("es-CL")}`; }

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16,
};

export default function EventosAdminPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Evento>>({});
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({
    titulo: "", fecha: "", fechaCorta: "", mes: "", hora: "20:00",
    precio: "", cupos: "", tipo: "fiesta" as TipoEvento, emoji: "🎉",
  });

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/eventos");
    const data = await res.json();
    setEventos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function patch(id: string, body: Partial<Evento>) {
    setError(null);
    const res = await fetch(`/api/eventos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar");
      await cargar();
      return null;
    }
    const updated: Evento = await res.json();
    setEventos(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  }

  async function toggle(e: Evento, campo: "destacado" | "publicado") {
    setEventos(prev => prev.map(x => x.id === e.id ? { ...x, [campo]: !x[campo] } : x));
    await patch(e.id, { [campo]: !e[campo] });
  }

  function startEdit(e: Evento) {
    setEditId(e.id);
    setDraft({
      titulo: e.titulo, subtitulo: e.subtitulo, fecha: e.fecha, fechaCorta: e.fechaCorta,
      mes: e.mes, hora: e.hora, duracion: e.duracion, precio: e.precio, cupos: e.cupos,
      emoji: e.emoji, tipo: e.tipo, estado: e.estado, descripcion: e.descripcion,
      detalles: e.detalles, imagen: e.imagen,
    });
  }

  async function guardar(id: string) {
    const ok = await patch(id, draft);
    if (ok) setEditId(null);
  }

  async function eliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/eventos/${id}`, { method: "DELETE" });
    if (res.ok) setEventos(prev => prev.filter(e => e.id !== id));
    else setError("No se pudo eliminar el evento");
  }

  async function crear() {
    if (!nuevo.titulo.trim()) return;
    setCreando(true);
    setError(null);
    const res = await fetch("/api/eventos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...nuevo,
        precio: parseInt(nuevo.precio, 10) || 0,
        cupos: parseInt(nuevo.cupos, 10) || 0,
        publicado: false,
        destacado: false,
      }),
    });
    setCreando(false);
    if (res.ok) {
      const created: Evento = await res.json();
      setEventos(prev => [...prev, created]);
      setNuevo({ titulo: "", fecha: "", fechaCorta: "", mes: "", hora: "20:00", precio: "", cupos: "", tipo: "fiesta", emoji: "🎉" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo crear el evento");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Eventos</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {eventos.length} eventos · {eventos.filter(e => e.publicado).length} publicados · {eventos.filter(e => e.destacado).length} destacados en el home
          </div>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {eventos.map((e, idx) => {
              const isEd = editId === e.id;
              return (
                <div key={e.id} style={{ padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`, opacity: e.publicado ? 1 : 0.55 }}>
                  {isEd ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <SelectorFoto valor={draft.imagen ?? ""} onChange={imagen => setDraft(d => ({ ...d, imagen }))} alto={110} />

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input value={draft.emoji ?? ""} onChange={ev => setDraft(d => ({ ...d, emoji: ev.target.value }))}
                          placeholder="Emoji" style={{ ...inputBase, width: 70, textAlign: "center" }} />
                        <input value={draft.titulo ?? ""} onChange={ev => setDraft(d => ({ ...d, titulo: ev.target.value }))}
                          placeholder="Título" style={{ ...inputBase, flex: 2, minWidth: 220 }} />
                        <input value={draft.subtitulo ?? ""} onChange={ev => setDraft(d => ({ ...d, subtitulo: ev.target.value }))}
                          placeholder="Subtítulo (ITALIA · RISTORANTE)" style={{ ...inputBase, flex: 2, minWidth: 200 }} />
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input value={draft.fecha ?? ""} onChange={ev => setDraft(d => ({ ...d, fecha: ev.target.value }))}
                          placeholder="Lunes 19 de agosto" style={{ ...inputBase, flex: 2, minWidth: 200 }} />
                        <input value={draft.fechaCorta ?? ""} onChange={ev => setDraft(d => ({ ...d, fechaCorta: ev.target.value }))}
                          placeholder="LUN 19" style={{ ...inputBase, width: 110 }} />
                        <input value={draft.mes ?? ""} onChange={ev => setDraft(d => ({ ...d, mes: ev.target.value }))}
                          placeholder="AGOSTO" style={{ ...inputBase, width: 130 }} />
                        <input value={draft.hora ?? ""} onChange={ev => setDraft(d => ({ ...d, hora: ev.target.value }))}
                          placeholder="20:00" style={{ ...inputBase, width: 90 }} />
                        <input value={draft.duracion ?? ""} onChange={ev => setDraft(d => ({ ...d, duracion: ev.target.value }))}
                          placeholder="3 horas" style={{ ...inputBase, width: 110 }} />
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="number" value={draft.precio ?? 0} onChange={ev => setDraft(d => ({ ...d, precio: parseInt(ev.target.value) || 0 }))}
                          placeholder="Precio" style={{ ...inputBase, width: 120 }} />
                        <input type="number" value={draft.cupos ?? 0} onChange={ev => setDraft(d => ({ ...d, cupos: parseInt(ev.target.value) || 0 }))}
                          placeholder="Cupos" style={{ ...inputBase, width: 110 }} />
                        <select value={draft.tipo} onChange={ev => setDraft(d => ({ ...d, tipo: ev.target.value as TipoEvento }))} style={inputBase}>
                          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={draft.estado} onChange={ev => setDraft(d => ({ ...d, estado: ev.target.value as EstadoEvento }))} style={inputBase}>
                          {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <textarea value={draft.descripcion ?? ""} onChange={ev => setDraft(d => ({ ...d, descripcion: ev.target.value }))}
                        placeholder="Descripción" style={{ ...inputBase, minHeight: 60 }} />

                      <textarea
                        value={(draft.detalles ?? []).join("\n")}
                        onChange={ev => setDraft(d => ({ ...d, detalles: ev.target.value.split("\n").filter(l => l.trim()) }))}
                        placeholder="Un detalle por línea"
                        style={{ ...inputBase, minHeight: 90 }}
                      />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => guardar(e.id)} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Guardar</button>
                        <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <div style={{
                        width: 74, height: 52, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: SURF2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {e.imagen ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolverImagen(e.imagen, 220, 150)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: TEXT3, fontSize: 12 }}>sin foto</span>
                        )}
                      </div>
                      <span style={{ fontSize: 26 }}>{e.emoji}</span>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 19 }}>{e.titulo}</span>
                          <span style={{ fontSize: 15, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{e.tipo}</span>
                          {e.estado !== "abierto" && (
                            <span style={{ fontSize: 15, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{e.estado}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 16, color: TEXT2, marginTop: 2 }}>
                          {e.fechaCorta} {e.mes} · {e.hora} hrs · {e.cupos} cupos ({e.registrados} inscritos)
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 18, color: AMR, flexShrink: 0 }}>{fmt(e.precio)}</div>

                      <button onClick={() => toggle(e, "destacado")} title="Mostrar en el home" style={{
                        flexShrink: 0, fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                        background: e.destacado ? "#3a2f10" : SURF2, color: e.destacado ? AMR : TEXT3,
                      }}>{e.destacado ? "★ En el home" : "☆ Home"}</button>

                      <button onClick={() => toggle(e, "publicado")} style={{
                        flexShrink: 0, fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: FONT,
                        background: e.publicado ? "#1a2e1a" : SURF2, color: e.publicado ? VERDE : TEXT3,
                      }}>{e.publicado ? "Publicado" : "Borrador"}</button>

                      <a href={`/eventos/${e.id}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", fontSize: 15, textDecoration: "none" }}>Ver</a>
                      <button onClick={() => startEdit(e)} style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>Editar</button>
                      <button onClick={() => eliminar(e.id, e.titulo)} style={{ flexShrink: 0, background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
            {eventos.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Sin eventos</div>}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>+ Agregar evento</div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>Se crea como borrador. Complétalo con “Editar” y publícalo cuando esté listo.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="🎉" value={nuevo.emoji} onChange={ev => setNuevo(n => ({ ...n, emoji: ev.target.value }))} style={{ ...inputBase, width: 60, textAlign: "center" }} />
            <input placeholder="Título del evento" value={nuevo.titulo} onChange={ev => setNuevo(n => ({ ...n, titulo: ev.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            <input placeholder="Viernes 4 de septiembre" value={nuevo.fecha} onChange={ev => setNuevo(n => ({ ...n, fecha: ev.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 180 }} />
            <input placeholder="VIE 4" value={nuevo.fechaCorta} onChange={ev => setNuevo(n => ({ ...n, fechaCorta: ev.target.value }))} style={{ ...inputBase, width: 100 }} />
            <input placeholder="SEPTIEMBRE" value={nuevo.mes} onChange={ev => setNuevo(n => ({ ...n, mes: ev.target.value }))} style={{ ...inputBase, width: 130 }} />
            <input placeholder="20:00" value={nuevo.hora} onChange={ev => setNuevo(n => ({ ...n, hora: ev.target.value }))} style={{ ...inputBase, width: 85 }} />
            <input type="number" placeholder="Precio" value={nuevo.precio} onChange={ev => setNuevo(n => ({ ...n, precio: ev.target.value }))} style={{ ...inputBase, width: 110 }} />
            <input type="number" placeholder="Cupos" value={nuevo.cupos} onChange={ev => setNuevo(n => ({ ...n, cupos: ev.target.value }))} style={{ ...inputBase, width: 100 }} />
            <select value={nuevo.tipo} onChange={ev => setNuevo(n => ({ ...n, tipo: ev.target.value as TipoEvento }))} style={inputBase}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={crear} disabled={creando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {creando ? "..." : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
