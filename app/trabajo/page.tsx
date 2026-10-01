"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT3, AMR, VERDE, FONT, TITLE } from "../../lib/tokens";

export default function TrabajoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const inputCv = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar() {
    if (!nombre.trim() || !correo.trim() || !telefono.trim() || !cv) {
      setError("Completa todos los campos y adjunta tu currículum.");
      return;
    }
    setEnviando(true);
    setError("");
    const fd = new FormData();
    fd.append("nombre", nombre.trim());
    fd.append("correo", correo.trim());
    fd.append("telefono", telefono.trim());
    fd.append("cv", cv);
    const res = await fetch("/api/postulaciones", { method: "POST", body: fd });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo enviar. Intenta de nuevo.");
      return;
    }
    setEnviado(true);
    setNombre(""); setCorreo(""); setTelefono(""); setCv(null);
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "48px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={100} height={35} style={{ margin: "0 auto 16px", height: "auto" }} />
          <div style={{ fontFamily: TITLE, fontSize: 28, fontWeight: 900 }}>Trabaja con nosotros</div>
          <div style={{ fontSize: 15, color: TEXT3, marginTop: 4 }}>
            Cuéntanos de ti y adjunta tu currículum. Si calzas con lo que buscamos, te contactamos.
          </div>
        </div>

        {enviado ? (
          <div style={{ background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: 16, padding: 24, color: VERDE, textAlign: "center" }}>
            ✓ ¡Listo! Recibimos tu postulación.
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setEnviado(false)} style={{ background: "none", border: "1px solid #2d5a2d", color: VERDE, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: FONT }}>
                Enviar otra postulación
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Nombre completo</div>
              <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Correo</div>
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} style={inp} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Teléfono</div>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" style={inp} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: TEXT3, marginBottom: 6 }}>Currículum (PDF o Word)</div>
              <input ref={inputCv} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
                onChange={e => setCv(e.target.files?.[0] ?? null)} />
              <button onClick={() => inputCv.current?.click()} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: SURF2, border: `1px dashed ${BORDER}`, color: cv ? TEXT1 : TEXT3, borderRadius: 10,
                padding: "16px 0", cursor: "pointer", fontFamily: FONT, fontSize: 15, fontWeight: 600,
              }}>
                <Upload size={18} />
                {cv ? cv.name : "Subir archivo"}
              </button>
            </div>

            {error && <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div>}

            <button onClick={enviar} disabled={enviando} style={{
              background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "12px 0",
              fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: FONT, marginTop: 4,
            }}>
              {enviando ? "Enviando…" : "Enviar postulación"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
