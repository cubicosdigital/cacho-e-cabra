"use client";
import { useEffect, useState } from "react";
import { MessageCircle, FileText } from "lucide-react";
import type { Postulacion, EstadoPostulacion } from "../../../../lib/postulaciones";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, ROJO, VERDE, FONT, TITLE } from "../../../../lib/tokens";

const ESTADOS: { value: EstadoPostulacion; label: string; color: string }[] = [
  { value: "nueva", label: "Nueva", color: AMR },
  { value: "contactado", label: "Contactado", color: VERDE },
  { value: "descartado", label: "Descartado", color: ROJO },
];

/** Deja el teléfono en formato internacional sin signos para el link de WhatsApp. Si viene sin código de país, asume Chile (+56). */
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

  if (sinAcceso) {
    return (
      <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT2, padding: 40, textAlign: "center" }}>
        Esta sección es solo para quienes tienen permiso de Postulaciones.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Postulaciones</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {postulaciones.length} recibidas · {postulaciones.filter(p => p.estado === "nueva").length} nuevas
          </div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : postulaciones.length === 0 ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center", color: TEXT3 }}>
            Todavía no hay postulaciones.
          </div>
        ) : postulaciones.map(p => {
          const est = ESTADOS.find(e => e.value === p.estado)!;
          return (
            <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${est.color}`, borderRadius: 14, padding: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: TEXT1, marginBottom: 4 }}>{p.nombre}</div>
                <div style={{ fontSize: 14, color: TEXT3 }}>{p.correo} · {p.telefono}</div>
                <div style={{ fontSize: 13, color: TEXT3, marginTop: 6 }}>
                  {new Date(p.created_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                <a href={p.cv_url} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 14px",
                  color: TEXT1, textDecoration: "none", fontWeight: 700, fontSize: 14,
                }}>
                  <FileText size={16} /> Ver currículum
                </a>
                <a href={`https://wa.me/${telefonoWhatsapp(p.telefono)}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}, te escribimos de Cacho Cabra por tu postulación 🙂`)}`}
                  target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "#1f8a3d", border: "none", borderRadius: 8, padding: "9px 14px",
                    color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14,
                  }}>
                  <MessageCircle size={16} /> Escribir por WhatsApp
                </a>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
                {ESTADOS.map(e => (
                  <button key={e.value} onClick={() => actualizar(p.id, { estado: e.value })} style={{
                    fontSize: 13, fontWeight: 700, borderRadius: 8, padding: "6px 10px", border: "none", cursor: "pointer", fontFamily: FONT,
                    background: p.estado === e.value ? e.color : SURF2, color: p.estado === e.value ? "#1a1200" : TEXT3,
                  }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
