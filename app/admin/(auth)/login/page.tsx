"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modo, setModo] = useState<"password" | "codigo">("password");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    // Instanciado dentro del handler (no en el cuerpo del componente) para que el build
    // estático no falle si aún no hay credenciales de Supabase en .env.local.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Credenciales incorrectas"); setLoading(false); return; }
    router.push("/admin");
    router.refresh();
  }

  function clienteSupabase() {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  async function enviarCodigo() {
    setLoading(true);
    setError("");
    const { error } = await clienteSupabase().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setLoading(false);
    if (error) { setError("No pudimos enviar el código. Revisa tu correo o pide tu invitación al administrador."); return; }
    setCodigoEnviado(true);
  }

  async function entrarConCodigo() {
    setLoading(true);
    setError("");
    const { error } = await clienteSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo, type: "email" });
    if (error) { setError("El código es incorrecto o ya venció."); setLoading(false); return; }
    router.push("/admin/mi-horario");
    router.refresh();
  }

  function cambiarModo() {
    setModo(m => (m === "password" ? "codigo" : "password"));
    setCodigoEnviado(false); setCodigo(""); setError("");
  }

  const inp: React.CSSProperties = {
    padding: "14px 16px", background: "#232019", border: `1.5px solid ${BORDER}`,
    borderRadius: 10, color: TEXT1, fontSize: 20, fontFamily: FONT, outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={120} height={42} style={{ margin: "0 auto 12px", height: "auto" }} />
          <p style={{ color: TEXT3, fontSize: 17, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
            Panel de administración
          </p>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: TEXT1, margin: "0 0 20px", textAlign: "center" }}>
            Iniciar sesión
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 16, color: TEXT3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="tu@cachocabrabar.cl" />
            </div>
            {modo === "password" && (
            <div>
              <div style={{ fontSize: 16, color: TEXT3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contraseña</div>
              <div style={{ position: "relative" }}>
                <input type={verPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ ...inp, paddingRight: 46 }} placeholder="••••••••" />
                <button type="button" onClick={() => setVerPassword(v => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none", cursor: "pointer", color: TEXT3,
                  }}>
                  {verPassword ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            )}
            {modo === "codigo" && codigoEnviado && (
              <div>
                <div style={{ fontSize: 16, color: TEXT3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Código de 6 dígitos</div>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && codigo.length >= 6 && entrarConCodigo()}
                  style={{ ...inp, textAlign: "center", letterSpacing: "0.4em", fontSize: 26 }} placeholder="000000" />
                <div style={{ fontSize: 14, color: TEXT3, marginTop: 6 }}>Te lo enviamos a {email}.</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "#231515", border: `1px solid #6b2020`, color: "#fca5a5", fontSize: 17, borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            onClick={modo === "password" ? handleLogin : codigoEnviado ? entrarConCodigo : enviarCodigo}
            disabled={loading || (modo === "codigo" && codigoEnviado && codigo.length < 6)}
            style={{ width: "100%", padding: "13px", background: AMR, color: "#1a1200", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 19, cursor: "pointer", fontFamily: FONT, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Un momento..." : modo === "password" ? "Entrar" : codigoEnviado ? "Entrar" : "Enviar código a mi correo"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 20 }}>
          <button type="button" onClick={cambiarModo} style={{ background: "none", border: "none", color: AMR, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
            {modo === "password" ? "Soy trabajador: entrar con código" : "Volver a entrar con contraseña"}
          </button>
        </p>
        <p style={{ textAlign: "center", marginTop: 8 }}>
          <a href="/admin/recuperar" style={{ color: TEXT3, fontSize: 14, textDecoration: "none" }}>
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </div>
    </div>
  );
}
