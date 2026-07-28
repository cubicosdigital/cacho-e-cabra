"use client";
import { useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../../lib/tokens";

const TIPOS = [
  { value: "acoso", label: "Acoso" },
  { value: "seguridad", label: "Seguridad" },
  { value: "irregularidad", label: "Irregularidad" },
  { value: "otro", label: "Otro" },
];

export default function NuevaDenunciaPage() {
  const [tipo, setTipo] = useState("acoso");
  const [descripcion, setDescripcion] = useState("");
  const [anonima, setAnonima] = useState(true);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar() {
    if (!descripcion.trim()) return;
    setEnviando(true);
    setError("");
    const res = await fetch("/api/denuncias", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, descripcion, anonima, nombre_denunciante: anonima ? null : nombre }),
    });
    setEnviando(false);
    if (!res.ok) { setError("No se pudo enviar. Intenta de nuevo."); return; }
    setEnviado(true);
    setDescripcion(""); setNombre("");
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT1, fontFamily: FONT, fontSize: 18, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Canal de denuncias</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Solo la administración ve estas denuncias. Puedes enviarla de forma anónima.</div>
        </div>

        {enviado ? (
          <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: 16, padding: 24, color: VERDE, textAlign: "center" }}>
            ✓ Denuncia enviada. Gracias por reportarlo.
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setEnviado(false)} style={{ background: "none", border: `1px solid #2d5a2d`, color: VERDE, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: FONT }}>Enviar otra</button>
            </div>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 16, color: TEXT3, marginBottom: 6 }}>Tipo</div>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 16, color: TEXT3, marginBottom: 6 }}>Descripción</div>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={5} style={{ ...inp, resize: "vertical" }} placeholder="Cuéntanos qué pasó, cuándo y quién estuvo involucrado…" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, color: TEXT2, cursor: "pointer" }}>
              <input type="checkbox" checked={anonima} onChange={e => setAnonima(e.target.checked)} />
              Enviar de forma anónima
            </label>
            {!anonima && (
              <div>
                <div style={{ fontSize: 16, color: TEXT3, marginBottom: 6 }}>Tu nombre (opcional)</div>
                <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} />
              </div>
            )}
            {error && <div style={{ color: "#fca5a5", fontSize: 17 }}>{error}</div>}
            <button onClick={enviar} disabled={enviando || !descripcion.trim()}
              style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, cursor: "pointer", fontFamily: FONT, opacity: enviando ? 0.7 : 1 }}>
              {enviando ? "Enviando…" : "Enviar denuncia"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
