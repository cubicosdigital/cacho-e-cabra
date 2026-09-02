"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BG, SURFACE, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

type Paso = "email" | "codigo" | "nueva-clave" | "listo";

export default function RecuperarPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave1, setClave1] = useState("");
  const [clave2, setClave2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function enviarCodigo() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) { setError("No se pudo enviar el código. Revisa el email."); return; }
    setCooldown(30);
    setPaso("codigo");
  }

  async function verificarCodigo() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    setLoading(false);
    if (error) { setError("Código incorrecto o vencido."); return; }
    setPaso("nueva-clave");
  }

  async function guardarClave() {
    if (clave1.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (clave1 !== clave2) { setError("Las dos contraseñas no coinciden."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password: clave1 });
    setLoading(false);
    if (error) { setError("No se pudo actualizar la contraseña."); return; }
    setPaso("listo");
  }

  const inp: React.CSSProperties = {
    padding: "14px 16px", background: "#232019", border: `1.5px solid ${BORDER}`,
    borderRadius: 10, color: TEXT1, fontSize: 20, fontFamily: FONT, outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  const label: React.CSSProperties = {
    fontSize: 16, color: TEXT3, fontWeight: 600, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "0.06em",
  };

  const boton: React.CSSProperties = {
    width: "100%", padding: "13px", background: AMR, color: "#1a1200", border: "none",
    borderRadius: 10, fontWeight: 800, fontSize: 19, cursor: "pointer", fontFamily: FONT,
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
          {paso === "email" && (
            <>
              <h1 style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: TEXT1, margin: "0 0 8px", textAlign: "center" }}>
                Recuperar contraseña
              </h1>
              <p style={{ color: TEXT3, fontSize: 15, textAlign: "center", margin: "0 0 20px" }}>
                Te enviaremos un código a tu email.
              </p>
              <div style={{ marginBottom: 18 }}>
                <div style={label}>Email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && enviarCodigo()} style={inp} placeholder="tu@cachocabrabar.cl" />
              </div>
              {error && <Error msg={error} />}
              <button onClick={enviarCodigo} disabled={loading || !email} style={{ ...boton, opacity: loading || !email ? 0.7 : 1 }}>
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </>
          )}

          {paso === "codigo" && (
            <>
              <h1 style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: TEXT1, margin: "0 0 8px", textAlign: "center" }}>
                Ingresa el código
              </h1>
              <p style={{ color: TEXT3, fontSize: 15, textAlign: "center", margin: "0 0 20px" }}>
                Revisa el correo enviado a <strong style={{ color: TEXT1 }}>{email}</strong>.
              </p>
              <div style={{ marginBottom: 18 }}>
                <div style={label}>Código</div>
                <input value={codigo} onChange={e => setCodigo(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verificarCodigo()} style={{ ...inp, textAlign: "center", letterSpacing: "0.3em" }}
                  placeholder="12345678" maxLength={8} />
              </div>
              {error && <Error msg={error} />}
              <button onClick={verificarCodigo} disabled={loading || !codigo} style={{ ...boton, opacity: loading || !codigo ? 0.7 : 1 }}>
                {loading ? "Verificando..." : "Verificar código"}
              </button>
              <button onClick={enviarCodigo} disabled={loading || cooldown > 0} style={{ width: "100%", background: "none", border: "none", color: TEXT3, fontSize: 14, marginTop: 14, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: FONT, opacity: cooldown > 0 ? 0.6 : 1 }}>
                {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
              </button>
            </>
          )}

          {paso === "nueva-clave" && (
            <>
              <h1 style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: TEXT1, margin: "0 0 20px", textAlign: "center" }}>
                Nueva contraseña
              </h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                <div>
                  <div style={label}>Nueva contraseña</div>
                  <input type="password" value={clave1} onChange={e => setClave1(e.target.value)} style={inp} placeholder="••••••••" />
                </div>
                <div>
                  <div style={label}>Repite la contraseña</div>
                  <input type="password" value={clave2} onChange={e => setClave2(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && guardarClave()} style={inp} placeholder="••••••••" />
                </div>
              </div>
              {error && <Error msg={error} />}
              <button onClick={guardarClave} disabled={loading || !clave1 || !clave2} style={{ ...boton, opacity: loading || !clave1 || !clave2 ? 0.7 : 1 }}>
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </>
          )}

          {paso === "listo" && (
            <>
              <h1 style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: TEXT1, margin: "0 0 8px", textAlign: "center" }}>
                Contraseña actualizada
              </h1>
              <p style={{ color: TEXT3, fontSize: 15, textAlign: "center", margin: "0 0 20px" }}>
                Ya puedes entrar con tu nueva contraseña.
              </p>
              <button onClick={() => { router.push("/admin/pedidos"); router.refresh(); }} style={boton}>
                Ir al panel
              </button>
            </>
          )}
        </div>

        {paso !== "listo" && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/admin/login" style={{ color: TEXT3, fontSize: 14, textDecoration: "none" }}>
              ← Volver a iniciar sesión
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function Error({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#231515", border: "1px solid #6b2020", color: "#fca5a5", fontSize: 15, borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
      {msg}
    </div>
  );
}
