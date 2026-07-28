"use client";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, ROJO, VERDE, FONT, TITLE } from "../../../../lib/tokens";

type Estado = "nuevo" | "en_revision" | "resuelto";
interface Reclamo {
  id: string; nombre: string; email: string; telefono: string | null; mensaje: string; tipo: string;
  estado: Estado; respuesta_admin: string | null; created_at: string;
}

const ESTADOS: { value: Estado; label: string; color: string }[] = [
  { value: "nuevo", label: "Nuevo", color: ROJO },
  { value: "en_revision", label: "En revisión", color: AMR },
  { value: "resuelto", label: "Resuelto", color: VERDE },
];

export default function ReclamosAdminPage() {
  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sinAcceso, setSinAcceso] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/reclamos");
      if (res.status === 403) { setSinAcceso(true); setLoading(false); return; }
      if (res.ok) setReclamos(await res.json());
      setLoading(false);
    })();
  }, []);

  async function actualizar(id: string, cambios: Partial<Reclamo>) {
    setReclamos(prev => prev.map(r => r.id === id ? { ...r, ...cambios } : r));
    await fetch(`/api/reclamos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
  }

  if (sinAcceso) {
    return (
      <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT2, padding: 40, textAlign: "center" }}>
        Esta bandeja es solo para administradores.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Reclamos</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{reclamos.length} recibidos · {reclamos.filter(r => r.estado === "nuevo").length} nuevos</div>
        </div>

        {loading ? <div style={{ color: TEXT3 }}>Cargando…</div> : reclamos.length === 0 ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center", color: TEXT3 }}>Sin reclamos</div>
        ) : reclamos.map(r => {
          const est = ESTADOS.find(e => e.value === r.estado)!;
          return (
            <div key={r.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${est.color}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px", textTransform: "uppercase" }}>{r.tipo}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{r.nombre}</span>
                <span style={{ fontSize: 16, color: TEXT3 }}>{r.email}{r.telefono ? ` · ${r.telefono}` : ""}</span>
                <span style={{ fontSize: 16, color: TEXT3, marginLeft: "auto" }}>{new Date(r.created_at).toLocaleDateString("es-CL")}</span>
              </div>
              <div style={{ fontSize: 18, color: TEXT2, lineHeight: 1.6, marginBottom: 12 }}>{r.mensaje}</div>
              <textarea placeholder="Respuesta al cliente / notas internas…" defaultValue={r.respuesta_admin ?? ""} onChange={e => setRespuestas(v => ({ ...v, [r.id]: e.target.value }))}
                style={{ width: "100%", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17, minHeight: 50, boxSizing: "border-box", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {ESTADOS.map(e => (
                    <button key={e.value} onClick={() => actualizar(r.id, { estado: e.value })}
                      style={{ fontSize: 16, fontWeight: r.estado === e.value ? 700 : 500, color: r.estado === e.value ? "#1a1200" : TEXT3, background: r.estado === e.value ? e.color : SURF2, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT }}>
                      {e.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => actualizar(r.id, { respuesta_admin: respuestas[r.id] ?? r.respuesta_admin ?? "" })}
                  style={{ fontSize: 16, color: TEXT1, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: FONT }}>
                  Guardar respuesta
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
