"use client";
import { useEffect, useState } from "react";
import { totalPresupuesto, subtotalItems, type Presupuesto, type Bloque, type EstadoPresupuesto, type ItemPresupuesto } from "../../../../lib/presupuestos";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

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


interface PlantillaApi { id: string; nombre: string; intro: string; bloques: Bloque[]; items: ItemPresupuesto[]; notas: string; precio_por_persona: number }
interface Contenido { intro: string; texto: string; items: ItemPresupuesto[]; notas: string }

/** Líneas de cobro adicionales: se pueden agregar tantas como se necesiten. */
function EditorItems({ items, onChange }: { items: ItemPresupuesto[]; onChange: (i: ItemPresupuesto[]) => void }) {
  const set = (idx: number, cambio: Partial<ItemPresupuesto>) => onChange(items.map((x, i) => i === idx ? { ...x, ...cambio } : x));
  return (
    <div>
      <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700, marginBottom: 4 }}>Ítems adicionales</div>
      <div style={{ fontSize: 14, color: TEXT3, marginBottom: 8 }}>Cada ítem suma al total: por ejemplo arriendo de mesas, garzón extra, torta o decoración.</div>
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 84px 120px 110px 32px", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 12, fontWeight: 800, color: TEXT3, textTransform: "uppercase" }}>
          <div>Descripción</div><div>Cantidad</div><div>Precio unit.</div><div style={{ textAlign: "right" }}>Subtotal</div><div />
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 84px 120px 110px 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input value={it.descripcion} onChange={e => set(i, { descripcion: e.target.value })} placeholder="Ej. Arriendo de mesas" style={inputBase} />
          <input type="number" min={0} value={it.cantidad || ""} onChange={e => set(i, { cantidad: parseInt(e.target.value, 10) || 0 })} style={inputBase} />
          <input type="number" min={0} value={it.precio || ""} onChange={e => set(i, { precio: parseInt(e.target.value, 10) || 0 })} style={inputBase} />
          <div style={{ textAlign: "right", fontWeight: 700, color: TEXT1 }}>{fmt(it.cantidad * it.precio)}</div>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} title="Quitar" style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onChange([...items, { descripcion: "", cantidad: 1, precio: 0 }])} style={{ background: SURF2, border: `1px dashed ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>+ Agregar ítem</button>
        {items.length > 0 && <span style={{ color: TEXT2, fontSize: 15 }}>Suma de ítems: <strong style={{ color: TEXT1 }}>{fmt(subtotalItems(items))}</strong></span>}
      </div>
    </div>
  );
}

function EditorContenido({ c, setC }: { c: Contenido; setC: (c: Contenido) => void }) {
  return (
    <>
      <textarea value={c.intro} onChange={e => setC({ ...c, intro: e.target.value })} placeholder="Texto de introducción" style={{ ...inputBase, minHeight: 70 }} />
      <div>
        <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700, marginBottom: 4 }}>Contenido del presupuesto</div>
        <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>
          <code># Título</code> abre una sección · una línea terminada en <code>:</code> es un subtítulo · el resto son líneas · una línea en blanco separa grupos.
        </div>
        <textarea value={c.texto} onChange={e => setC({ ...c, texto: e.target.value })}
          style={{ ...inputBase, minHeight: 220, width: "100%", boxSizing: "border-box", fontFamily: "ui-monospace, monospace", fontSize: 14, lineHeight: 1.6 }} />
      </div>
      <EditorItems items={c.items} onChange={items => setC({ ...c, items })} />
      <textarea value={c.notas} onChange={e => setC({ ...c, notas: e.target.value })} placeholder="Notas finales (opcional)" style={{ ...inputBase, minHeight: 60 }} />
    </>
  );
}

export default function PresupuestosPage() {
  const [lista, setLista] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Presupuesto>>({});
  const [contenido, setContenido] = useState<Contenido>({ intro: "", texto: "", items: [], notas: "" });
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ cliente: "", telefono: "", precioPorPersona: "", personas: "", plantillaId: "" });
  const [plantillas, setPlantillas] = useState<PlantillaApi[]>([]);
  const [plantillaEdit, setPlantillaEdit] = useState<{ id: string | null; nombre: string; precio: number; c: Contenido } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/presupuestos");
    const data = await res.json();
    setLista(Array.isArray(data) ? data : []);
    const rp = await fetch("/api/plantillas-presupuesto");
    if (rp.ok) setPlantillas(await rp.json());
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

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
      precioPorPersona: p.precioPorPersona, personas: p.personas,
    });
    setContenido({ intro: p.intro, texto: bloquesATexto(p.bloques), items: p.items ?? [], notas: p.notas });
  }

  async function guardar(id: string) {
    const ok = await patch(id, { ...draft, intro: contenido.intro, notas: contenido.notas, items: contenido.items, bloques: textoABloques(contenido.texto) });
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
        plantillaId: nuevo.plantillaId || undefined,
      }),
    });
    setCreando(false);
    if (res.ok) {
      const created: Presupuesto = await res.json();
      setLista(prev => [created, ...prev]);
      setNuevo({ cliente: "", telefono: "", precioPorPersona: "", personas: "", plantillaId: "" });
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

  function contenidoDePlantilla(t: PlantillaApi): Contenido { return { intro: t.intro, texto: bloquesATexto(t.bloques), items: t.items ?? [], notas: t.notas }; }

  async function guardarComoPlantilla(p: Presupuesto) {
    const nombre = prompt("Nombre de la plantilla:", p.referencia || p.cliente);
    if (!nombre?.trim()) return;
    const res = await fetch("/api/plantillas-presupuesto", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, intro: contenido.intro, bloques: textoABloques(contenido.texto), items: contenido.items, notas: contenido.notas, precioPorPersona: draft.precioPorPersona ?? 0 }) });
    if (res.ok) { await cargar(); setAviso(`Plantilla "${nombre}" guardada.`); }
    else setError((await res.json().catch(() => ({}))).error || "No se pudo guardar la plantilla");
  }

  async function guardarPlantilla() {
    if (!plantillaEdit) return;
    setError(null);
    const cuerpo = { nombre: plantillaEdit.nombre, intro: plantillaEdit.c.intro, bloques: textoABloques(plantillaEdit.c.texto), items: plantillaEdit.c.items, notas: plantillaEdit.c.notas, precioPorPersona: plantillaEdit.precio };
    const res = await fetch(plantillaEdit.id ? `/api/plantillas-presupuesto/${plantillaEdit.id}` : "/api/plantillas-presupuesto", { method: plantillaEdit.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo guardar la plantilla"); return; }
    setPlantillaEdit(null); await cargar();
  }

  async function eliminarPlantilla(t: PlantillaApi) {
    if (!confirm(`¿Eliminar la plantilla "${t.nombre}"? Los presupuestos ya creados no se ven afectados.`)) return;
    const res = await fetch(`/api/plantillas-presupuesto/${t.id}`, { method: "DELETE" });
    if (res.ok) setPlantillas(prev => prev.filter(x => x.id !== t.id)); else setError("No se pudo eliminar la plantilla");
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

        {aviso && <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", color: VERDE, borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{aviso}</div>}
        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>+ Nuevo presupuesto</div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>
            Empieza vacío, o con una plantilla que copia su contenido (después lo editas, sin afectar la plantilla).
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Nombre del cliente" value={nuevo.cliente} onChange={e => setNuevo(n => ({ ...n, cliente: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 200 }} />
            <input placeholder="+56 9 ..." value={nuevo.telefono} onChange={e => setNuevo(n => ({ ...n, telefono: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 150 }} />
            <select value={nuevo.plantillaId} onChange={e => setNuevo(n => ({ ...n, plantillaId: e.target.value }))} style={{ ...inputBase, minWidth: 190 }}>
              <option value="">Vacío (sin plantilla)</option>
              {plantillas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
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

                      <EditorContenido c={contenido} setC={setContenido} />
                      <div style={{ background: SURF2, borderRadius: 8, padding: "10px 14px", fontSize: 16, color: TEXT2 }}>
                        Total del presupuesto: <strong style={{ color: TEXT1, fontSize: 20 }}>{fmt(totalPresupuesto({ precioPorPersona: draft.precioPorPersona ?? 0, personas: draft.personas ?? 0, items: contenido.items }))}</strong>
                        <span style={{ color: TEXT3 }}> ({draft.personas ?? 0} personas × {fmt(draft.precioPorPersona ?? 0)}{contenido.items.length > 0 ? ` + ${fmt(subtotalItems(contenido.items))} en ítems` : ""})</span>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => guardar(p.id)} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Guardar</button>
                        <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => guardarComoPlantilla(p)} style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>Guardar como plantilla</button>
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
                          {p.precioPorPersona > 0 && `${fmt(p.precioPorPersona)} por persona`}
                          {p.personas > 0 && ` · ${p.personas} personas`}
                          {(p.items?.length ?? 0) > 0 && ` · ${p.items.length} ítem${p.items.length > 1 ? "s" : ""}`}
                          {totalPresupuesto(p) > 0 && ` · total ${fmt(totalPresupuesto(p))}`}
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

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Plantillas</div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setPlantillaEdit({ id: null, nombre: "", precio: 0, c: { intro: "", texto: "", items: [], notas: "" } })} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>+ Nueva plantilla</button>
          </div>
          <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>Modelos listos para crear presupuestos más rápido. Los presupuestos que ya creaste no cambian si editas o borras una plantilla.</div>

          {plantillas.length === 0 && !plantillaEdit && <div style={{ color: TEXT3 }}>Aún no hay plantillas.</div>}
          {plantillas.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{t.nombre}</div>
                <div style={{ fontSize: 14, color: TEXT3 }}>{t.bloques.length} sección{t.bloques.length === 1 ? "" : "es"}{t.items?.length ? ` · ${t.items.length} ítems` : ""}{t.precio_por_persona ? ` · ${fmt(t.precio_por_persona)} por persona` : ""}</div>
              </div>
              <button onClick={() => setPlantillaEdit({ id: t.id, nombre: t.nombre, precio: t.precio_por_persona, c: contenidoDePlantilla(t) })} style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>Editar</button>
              <button onClick={() => eliminarPlantilla(t)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
            </div>
          ))}

          {plantillaEdit && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900 }}>{plantillaEdit.id ? "Editar plantilla" : "Nueva plantilla"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={plantillaEdit.nombre} onChange={e => setPlantillaEdit({ ...plantillaEdit, nombre: e.target.value })} placeholder="Nombre de la plantilla" style={{ ...inputBase, flex: 2, minWidth: 220 }} />
                <input type="number" value={plantillaEdit.precio || ""} onChange={e => setPlantillaEdit({ ...plantillaEdit, precio: parseInt(e.target.value, 10) || 0 })} placeholder="$ por persona (opcional)" style={{ ...inputBase, width: 190 }} />
              </div>
              <EditorContenido c={plantillaEdit.c} setC={c => setPlantillaEdit({ ...plantillaEdit, c })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={guardarPlantilla} disabled={!plantillaEdit.nombre.trim()} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: plantillaEdit.nombre.trim() ? 1 : 0.6 }}>Guardar plantilla</button>
                <button onClick={() => setPlantillaEdit(null)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontFamily: FONT }}>cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
