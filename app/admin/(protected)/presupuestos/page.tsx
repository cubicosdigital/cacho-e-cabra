"use client";
import { useEffect, useState } from "react";
import type { Presupuesto, Bloque, EstadoPresupuesto } from "../../../../lib/presupuestos";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

const ESTADOS: EstadoPresupuesto[] = ["borrador", "enviado", "aceptado", "rechazado"];

const ESTADO_META: Record<EstadoPresupuesto, { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: TEXT3, bg: SURF2 },
  enviado: { label: "Enviado", color: AMR, bg: "#3a2f10" },
  aceptado: { label: "Aceptado", color: "#34d399", bg: "#1a2e1a" },
  rechazado: { label: "Rechazado", color: "#fca5a5", bg: "#2a1212" },
};

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16,
};

/** El editor trabaja los bloques como texto plano: un subtítulo termina en ":" y el resto son líneas. */
function bloquesATexto(bloques: Bloque[]): string {
  return bloques.map(b =>
    `# ${b.titulo}\n` + b.grupos.map(g =>
      (g.subtitulo ? `${g.subtitulo}\n` : "") + g.lineas.join("\n")
    ).join("\n\n")
  ).join("\n\n");
}

function textoABloques(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;
  let grupo: { subtitulo: string; lineas: string[] } | null = null;

  for (const raw of texto.split("\n")) {
    const linea = raw.trim();

    if (linea.startsWith("#")) {
      if (actual && grupo) actual.grupos.push(grupo);
      if (actual) bloques.push(actual);
      actual = { titulo: linea.replace(/^#+\s*/, ""), grupos: [] };
      grupo = null;
      continue;
    }
    if (!actual) continue;

    if (!linea) {
      if (grupo) { actual.grupos.push(grupo); grupo = null; }
      continue;
    }
    if (linea.endsWith(":")) {
      if (grupo) actual.grupos.push(grupo);
      grupo = { subtitulo: linea, lineas: [] };
      continue;
    }
    if (!grupo) grupo = { subtitulo: "", lineas: [] };
    grupo.lineas.push(linea);
  }

  if (actual && grupo) actual.grupos.push(grupo);
  if (actual) bloques.push(actual);
  return bloques;
}

export default function PresupuestosPage() {
  const [lista, setLista] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Presupuesto>>({});
  const [draftTexto, setDraftTexto] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ cliente: "", telefono: "", precioPorPersona: "", personas: "" });

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/presupuestos");
    const data = await res.json();
    setLista(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function patch(id: string, body: Partial<Presupuesto>) {
    setError(null);
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo guardar");
      return null;
    }
    const updated: Presupuesto = await res.json();
    setLista(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }

  function startEdit(p: Presupuesto) {
    setEditId(p.id);
    setDraft({
      referencia: p.referencia, cliente: p.cliente, telefono: p.telefono, email: p.email,
      precioPorPersona: p.precioPorPersona, personas: p.personas, intro: p.intro, notas: p.notas,
    });
    setDraftTexto(bloquesATexto(p.bloques));
  }

  async function guardar(id: string) {
    const ok = await patch(id, { ...draft, bloques: textoABloques(draftTexto) });
    if (ok) setEditId(null);
  }

  async function crear() {
    if (!nuevo.cliente.trim()) return;
    setCreando(true);
    setError(null);
    const res = await fetch("/api/presupuestos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente: nuevo.cliente.trim(),
        telefono: nuevo.telefono.trim(),
        precioPorPersona: parseInt(nuevo.precioPorPersona, 10) || 0,
        personas: parseInt(nuevo.personas, 10) || 0,
      }),
    });
    setCreando(false);
    if (res.ok) {
      const created: Presupuesto = await res.json();
      setLista(prev => [created, ...prev]);
      setNuevo({ cliente: "", telefono: "", precioPorPersona: "", personas: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo crear el presupuesto");
    }
  }

  async function eliminar(id: string, cliente: string) {
    if (!confirm(`¿Eliminar el presupuesto de "${cliente}"?`)) return;
    const res = await fetch(`/api/presupuestos/${id}`, { method: "DELETE" });
    if (res.ok) setLista(prev => prev.filter(p => p.id !== id));
    else setError("No se pudo eliminar");
  }

  function whatsapp(p: Presupuesto) {
    const tel = p.telefono.replace(/[^\d]/g, "");
    const url = `${window.location.origin}/presupuesto/${p.id}`;
    const texto = `Hola ${p.cliente}, te enviamos el presupuesto de Cacho Cabra: ${url}`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Presupuestos</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {lista.length} presupuestos · {lista.filter(p => p.estado === "aceptado").length} aceptados
          </div>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>+ Nuevo presupuesto</div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>
            Se crea con la plantilla del Buffet de Asado Premium. Después lo editas.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Nombre del cliente" value={nuevo.cliente} onChange={e => setNuevo(n => ({ ...n, cliente: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            <input placeholder="+56 9 ..." value={nuevo.telefono} onChange={e => setNuevo(n => ({ ...n, telefono: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 150 }} />
            <input type="number" placeholder="$ por persona" value={nuevo.precioPorPersona} onChange={e => setNuevo(n => ({ ...n, precioPorPersona: e.target.value }))} style={{ ...inputBase, width: 150 }} />
            <input type="number" placeholder="N° personas" value={nuevo.personas} onChange={e => setNuevo(n => ({ ...n, personas: e.target.value }))} style={{ ...inputBase, width: 130 }} />
            <button onClick={crear} disabled={creando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {creando ? "..." : "Crear"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {lista.map((p, idx) => {
              const isEd = editId === p.id;
              const meta = ESTADO_META[p.estado];
              return (
                <div key={p.id} style={{ padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
                  {isEd ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input value={draft.cliente ?? ""} onChange={e => setDraft(d => ({ ...d, cliente: e.target.value }))} placeholder="Cliente" style={{ ...inputBase, flex: 2, minWidth: 180 }} />
                        <input value={draft.telefono ?? ""} onChange={e => setDraft(d => ({ ...d, telefono: e.target.value }))} placeholder="Teléfono" style={{ ...inputBase, width: 160 }} />
                        <input value={draft.email ?? ""} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="Email" style={{ ...inputBase, flex: 1, minWidth: 180 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="number" value={draft.precioPorPersona ?? 0} onChange={e => setDraft(d => ({ ...d, precioPorPersona: parseInt(e.target.value) || 0 }))} placeholder="$ por persona" style={{ ...inputBase, width: 160 }} />
                        <input type="number" value={draft.personas ?? 0} onChange={e => setDraft(d => ({ ...d, personas: parseInt(e.target.value) || 0 }))} placeholder="Personas" style={{ ...inputBase, width: 130 }} />
                      </div>

                      <textarea value={draft.intro ?? ""} onChange={e => setDraft(d => ({ ...d, intro: e.target.value }))}
                        placeholder="Texto de introducción" style={{ ...inputBase, minHeight: 70 }} />

                      <div>
                        <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700, marginBottom: 4 }}>Contenido del presupuesto</div>
                        <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>
                          <code># Título</code> abre una sección · una línea terminada en <code>:</code> es un subtítulo · el resto son líneas · una línea en blanco separa grupos.
                        </div>
                        <textarea value={draftTexto} onChange={e => setDraftTexto(e.target.value)}
                          style={{ ...inputBase, minHeight: 260, fontFamily: "ui-monospace, monospace", fontSize: 14, lineHeight: 1.6 }} />
                      </div>

                      <textarea value={draft.notas ?? ""} onChange={e => setDraft(d => ({ ...d, notas: e.target.value }))}
                        placeholder="Notas finales (opcional)" style={{ ...inputBase, minHeight: 60 }} />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => guardar(p.id)} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Guardar</button>
                        <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 19 }}>{p.cliente}</span>
                          <span style={{ fontSize: 15, color: meta.color, background: meta.bg, borderRadius: 6, padding: "2px 8px" }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: 16, color: TEXT2, marginTop: 2 }}>
                          {fmt(p.precioPorPersona)} por persona
                          {p.personas > 0 && ` · ${p.personas} personas · total ${fmt(p.precioPorPersona * p.personas)}`}
                          {p.telefono && ` · ${p.telefono}`}
                        </div>
                      </div>

                      <select value={p.estado} onChange={e => patch(p.id, { estado: e.target.value as EstadoPresupuesto })}
                        style={{ ...inputBase, fontSize: 15, padding: "6px 10px", flexShrink: 0 }}>
                        {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_META[s].label}</option>)}
                      </select>

                      <a href={`/presupuesto/${p.id}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", fontSize: 15, textDecoration: "none" }}>Ver / imprimir</a>
                      {p.telefono && (
                        <a href={whatsapp(p)} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: "#1a2e1a", color: "#34d399", borderRadius: 8, padding: "6px 12px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>WhatsApp</a>
                      )}
                      <button onClick={() => startEdit(p)} style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>Editar</button>
                      <button onClick={() => eliminar(p.id, p.cliente)} style={{ flexShrink: 0, background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
                    </div>
                  )}
                </div>
              );
            })}
            {lista.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Aún no hay presupuestos</div>}
          </div>
        )}
      </div>
    </div>
  );
}
