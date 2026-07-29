"use client";
import { useState } from "react";
import Image from "next/image";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT3, AMR, VERDE, FONT, TITLE } from "../../lib/tokens";

const TIPOS = [
  { value: "queja", label: "Queja" },
  { value: "sugerencia", label: "Sugerencia" },
  { value: "felicitacion", label: "Felicitación" },
];

export default function ReclamosPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState("queja");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar() {
    if (!nombre.trim() || !email.trim() || !mensaje.trim()) return;
    setEnviando(true);
    setError("");
    const res = await fetch("/api/reclamos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, telefono, tipo, mensaje }),
    });
    setEnviando(false);
    if (!res.ok) { setError("No se pudo enviar. Intenta de nuevo."); return; }
    setEnviado(true);
    setNombre(""); setEmail(""); setTelefono(""); setMensaje("");
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "48px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={100} height={35} style={{ margin: "0 auto 16px", height: "auto" }} />
          <div style={{ fontFamily: TITLE, fontSize: 28, fontWeight: 900 }}>Reclamos y sugerencias</div>
          <div style={{ fontSize: 15, color: TEXT3, marginTop: 4 }}>Tu opinión nos ayuda a mejorar. Te leemos.</div>
        </div>

        {enviado ? (
          <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: 16, padding: 24, color: VERDE, textAlign: "center" }}>
            ✓ Gracias, recibimos tu mensaje.
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setEnviado(false)} style={{ background: "none", border: "1px solid #2d5a2d", color: VERDE, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: FONT }}>Enviar otro</button>
            </div>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Nombre</div>
                <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Teléfono (opcional)</div>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Tipo</div>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Mensaje</div>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={5} style={{ ...inp, resize: "vertical" }} />
            </div>
            {error && <div style={{ color: "#fca5a5", fontSize: 15 }}>{error}</div>}
            <button onClick={enviar} disabled={enviando || !nombre.trim() || !email.trim() || !mensaje.trim()}
              style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, cursor: "pointer", fontFamily: FONT, opacity: enviando ? 0.7 : 1 }}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
