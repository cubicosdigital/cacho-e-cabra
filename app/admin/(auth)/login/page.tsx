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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    router.push("/admin/pedidos");
    router.refresh();
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
            <div>
              <div style={{ fontSize: 16, color: TEXT3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contraseña</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} style={inp} placeholder="••••••••" />
            </div>
          </div>

          {error && (
            <div style={{ background: "#231515", border: `1px solid #6b2020`, color: "#fca5a5", fontSize: 17, borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            style={{ width: "100%", padding: "13px", background: AMR, color: "#1a1200", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 19, cursor: "pointer", fontFamily: FONT, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
