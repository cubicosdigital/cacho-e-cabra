"use client";

import { useState } from "react";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../lib/tokens";

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: SURF2,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  color: TEXT1,
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
};

export default function RegistroButton({
  eventoId,
  titulo,
  agotado = false,
  size = "sm",
}: {
  eventoId: string;
  titulo: string;
  agotado?: boolean;
  size?: "sm" | "lg";
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", personas: 1 });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/eventos/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No pudimos registrar tu cupo. Intenta de nuevo.");
      }
      setListo(true);
      setForm({ nombre: "", email: "", telefono: "", personas: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  function cerrar() {
    setAbierto(false);
    setListo(false);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        disabled={agotado}
        style={{
          width: "100%",
          padding: size === "lg" ? "16px 40px" : "11px 16px",
          background: agotado ? SURF2 : AMR,
          color: agotado ? TEXT3 : "#1a1200",
          border: "none",
          borderRadius: size === "lg" ? 12 : 10,
          fontSize: size === "lg" ? 16 : 14,
          fontWeight: 800,
          fontFamily: FONT,
          cursor: agotado ? "not-allowed" : "pointer",
        }}
      >
        {agotado ? "Agotado" : "Registrarme"}
      </button>

      {abierto && (
        <div
          onClick={cerrar}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 32,
              maxWidth: 450, width: "100%", maxHeight: "90vh", overflow: "auto", fontFamily: FONT,
            }}
          >
            {listo ? (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: TEXT1 }}>¡Registro recibido!</div>
                <div style={{ fontSize: 15, color: TEXT2, lineHeight: 1.6 }}>
                  Te guardamos el cupo para <strong>{titulo}</strong>. Te contactamos para confirmar.
                </div>
                <button onClick={cerrar} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: TEXT1 }}>Registrarme en</div>
                  <div style={{ fontSize: 15, color: AMR, fontWeight: 700 }}>{titulo}</div>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: TEXT2 }}>
                  Nombre completo *
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" style={inputStyle} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: TEXT2 }}>
                  Email *
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" style={inputStyle} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: TEXT2 }}>
                  Teléfono *
                  <input required type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+56 9 XXXX XXXX" style={inputStyle} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: TEXT2 }}>
                  ¿Cuántas personas? *
                  <select value={form.personas} onChange={e => setForm({ ...form, personas: Number(e.target.value) })} style={inputStyle}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                    ))}
                  </select>
                </label>

                {error && <div style={{ fontSize: 13, color: "#fca5a5" }}>{error}</div>}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={cerrar} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: FONT, fontWeight: 700 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={enviando} style={{ flex: 2, background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, cursor: enviando ? "wait" : "pointer", fontFamily: FONT, opacity: enviando ? 0.6 : 1 }}>
                    {enviando ? "Registrando…" : "Confirmar registro"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
