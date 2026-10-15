"use client";
import { useEffect, useState } from "react";
import { MessageCircle, FileText, Download, Trash2 } from "lucide-react";
import { CATEGORIAS_POSTULACION, type Postulacion, type EstadoPostulacion } from "../../../../lib/postulaciones";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, ROJO, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const ESTADOS: { value: EstadoPostulacion; label: string; color: string }[] = [
  { value: "nueva", label: "Nueva", color: AMR },
  { value: "contactado", label: "Contactado", color: VERDE },
  { value: "descartado", label: "Descartado", color: ROJO },
];

/** Deja el teléfono en formato internacional sin signos para el link de WhatsApp. Si viene sin código de país, asume Chile (+56). */
/** Nombre de descarga legible: "CV - Juan Pérez.pdf". */
function nombreArchivoCv(p: Postulacion): string {
  const ext = p.cv_url.split(".").pop() || "pdf";
  const limpio = p.nombre.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "postulante";
  return `CV - ${limpio}.${ext}`;
}

const selChico: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1, borderRadius: 8, padding: "5px 8px", fontFamily: FONT, fontSize: 13, fontWeight: 700 };
const btnIcono: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT1, textDecoration: "none" };

function telefonoWhatsapp(telefono: string): string {
  const soloNumeros = telefono.replace(/\D/g, "");
  if (soloNumeros.startsWith("56")) return soloNumeros;
  if (soloNumeros.startsWith("9")) return `56${soloNumeros}`;
  return soloNumeros;
}

export default function PostulacionesAdminPage() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinAcceso, setSinAcceso] = useState(false);
  const [filtro, setFiltro] = useState<string>("todas");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/postulaciones");
      if (res.status === 403) { setSinAcceso(true); setLoading(false); return; }
      if (res.ok) setPostulaciones(await res.json());
      setLoading(false);
    })();
  }, []);

  async function actualizar(id: string, cambios: Partial<Postulacion>) {
    setPostulaciones(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p));
    await fetch(`/api/postulaciones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
  }

  async function categorizar(id: string, categoria: string) {
    const previo = postulaciones;
    setError("");
    setPostulaciones(prev => prev.map(p => p.id === id ? { ...p, categoria: categoria || null } : p));
    const res = await fetch(`/api/postulaciones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoria: categoria || null }) });
    if (!res.ok) { setPostulaciones(previo); setError("No se pudo guardar la categoría. ¿Corriste la migración 017 en Supabase?"); }
  }

  async function eliminar(p: Postulacion) {
    if (!confirm(`¿Eliminar la postulación de ${p.nombre}? Se borra también su currículum.`)) return;
    const res = await fetch(`/api/postulaciones/${p.id}`, { method: "DELETE" });
    if (res.ok) setPostulaciones(prev => prev.filter(x => x.id !== p.id));
    else setError("No se pudo eliminar.");
  }

  const visibles = filtro === "todas" ? postulaciones : filtro === "sin" ? postulaciones.filter(p => !p.categoria) : postulaciones.filter(p => p.categoria === filtro);

  if (sinAcceso) {
    return (
      <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT2, padding: 40, textAlign: "center" }}>
        Esta sección es solo para quienes tienen permiso de Postulaciones.
      </div>
    );
  }

  return (
    <div className="adm-page" style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div className="adm-h1" style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Postulaciones</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {postulaciones.length} recibidas · {postulaciones.filter(p => p.estado === "nueva").length} nuevas
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[{ value: "todas", label: "Todas" }, ...CATEGORIAS_POSTULACION, { value: "sin", label: "Sin categoría" }].map(c => (
            <button key={c.value} onClick={() => setFiltro(c.value)} style={{
              padding: "6px 16px", borderRadius: 999, border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: FONT, fontSize: 14, fontWeight: 700,
              background: filtro === c.value ? TEXT1 : "transparent", color: filtro === c.value ? BG : TEXT3,
            }}>{c.label}</button>
          ))}
        </div>

        {error && <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 15 }}>{error}</div>}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : visibles.length === 0 ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center", color: TEXT3 }}>
            Todavía no hay postulaciones.
          </div>
        ) : visibles.map(p => {
          const est = ESTADOS.find(e => e.value === p.estado)!;
          return (
            <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${est.color}`, borderRadius: 12, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, lineHeight: 1.35 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: TEXT1 }}>{p.nombre}</div>
                <div style={{ fontSize: 13, color: TEXT3 }}>{p.correo} · {p.telefono}</div>
                <div style={{ fontSize: 12, color: TEXT3 }}>
                  {new Date(p.created_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <select value={p.categoria ?? ""} onChange={e => categorizar(p.id, e.target.value)} title="Categoría" style={selChico}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS_POSTULACION.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={p.estado} onChange={e => actualizar(p.id, { estado: e.target.value as EstadoPostulacion })} title="Estado"
                  style={{ ...selChico, background: est.color, color: "#1a1200", border: "none" }}>
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
                <a href={p.cv_url} target="_blank" rel="noopener noreferrer" title="Ver currículum" style={btnIcono}><FileText size={15} /></a>
                <a href={p.cv_url} download={nombreArchivoCv(p)} title="Descargar currículum" style={btnIcono}><Download size={15} /></a>
                <a href={`https://wa.me/${telefonoWhatsapp(p.telefono)}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}, te escribimos de Cacho Cabra por tu postulación 🙂`)}`}
                  target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp" style={{ ...btnIcono, background: "#1f8a3d", border: "none", color: "#fff" }}><MessageCircle size={15} /></a>
                <button onClick={() => eliminar(p)} title="Eliminar postulación" style={{ ...btnIcono, color: "#fca5a5", cursor: "pointer" }}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
