"use client";
import { use, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../lib/tokens";
import { AFPS, BANCOS, ESTADOS_CIVILES, ISAPRES, PARENTESCOS, TIPOS_CUENTA, type Carga } from "../../../lib/fichas";

interface Info { nombre: string; rut: string | null; cargo: string | null; departamento: string; telefono: string | null }

const NACIONALIDADES = ["Chilena", "Venezolana", "Peruana", "Colombiana", "Haitiana", "Boliviana", "Argentina", "Ecuatoriana", "Otra"];
const VACIA = {
  email: "", telefono: "", direccion: "", comuna: "", fecha_nacimiento: "", nacionalidad: "Chilena", nacionalidad_otra: "", estado_civil: "",
  emergencia_nombre: "", emergencia_parentesco: "", emergencia_telefono: "",
  afp: "", salud_sistema: "", isapre_nombre: "", isapre_plan: "", seguro_cesantia: "",
  visa_tipo: "", visa_vencimiento: "", banco: "", tipo_cuenta: "", numero_cuenta: "",
  manipulador_alimentos: "", manipulador_vencimiento: "", consentimiento: false,
};

const inp: React.CSSProperties = {
  padding: "12px 14px", background: "#232019", border: `1.5px solid ${BORDER}`, borderRadius: 10,
  color: TEXT1, fontSize: 18, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box",
};

function Campo({ label, obligatorio, children }: { label: string; obligatorio?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 14, color: TEXT3, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{obligatorio && <span style={{ color: AMR }}> *</span>}
      </div>
      {children}
    </label>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontFamily: TITLE, fontSize: 21, fontWeight: 900, color: TEXT1 }}>{titulo}</div>
        {nota && <div style={{ fontSize: 15, color: TEXT3, marginTop: 2 }}>{nota}</div>}
      </div>
      {children}
    </div>
  );
}

function Opciones({ valor, onChange, lista, vacio = "Seleccionar…" }: { valor: string; onChange: (v: string) => void; lista: string[]; vacio?: string }) {
  return (
    <select value={valor} onChange={e => onChange(e.target.value)} style={inp}>
      <option value="">{vacio}</option>
      {lista.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SiNo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return <Opciones valor={valor} onChange={onChange} lista={["Sí", "No"]} />;
}

export default function RegistroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [errorLink, setErrorLink] = useState("");
  const [f, setF] = useState(VACIA);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [paso, setPaso] = useState<"form" | "codigo" | "listo">("form");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/registro/${token}`);
      const data = await res.json();
      if (!res.ok) { setErrorLink(data.error); return; }
      setInfo(data);
      setF(prev => ({ ...prev, telefono: data.telefono ? `+${data.telefono}` : "" }));
    })();
  }, [token]);

  const set = <K extends keyof typeof VACIA>(k: K, v: (typeof VACIA)[K]) => setF(p => ({ ...p, [k]: v }));
  const nacionalidad = f.nacionalidad === "Otra" ? f.nacionalidad_otra.trim() : f.nacionalidad;
  const esExtranjero = f.nacionalidad !== "Chilena";
  const aplicaManipulador = !!info && ["cocina", "barra", "coperia"].includes(info.departamento);

  const siNo = (v: string) => (v === "Sí" ? true : v === "No" ? false : null);

  function ficha() {
    return {
      telefono: f.telefono, direccion: f.direccion, comuna: f.comuna, fecha_nacimiento: f.fecha_nacimiento, nacionalidad,
      estado_civil: f.estado_civil, emergencia_nombre: f.emergencia_nombre, emergencia_parentesco: f.emergencia_parentesco,
      emergencia_telefono: f.emergencia_telefono, afp: f.afp, salud_sistema: f.salud_sistema || null,
      isapre_nombre: f.isapre_nombre, isapre_plan: f.isapre_plan, seguro_cesantia: siNo(f.seguro_cesantia), cargas,
      visa_tipo: esExtranjero ? f.visa_tipo : "", visa_vencimiento: esExtranjero ? f.visa_vencimiento : "",
      banco: f.banco, tipo_cuenta: f.tipo_cuenta, numero_cuenta: f.numero_cuenta,
      manipulador_alimentos: aplicaManipulador ? siNo(f.manipulador_alimentos) : null,
      manipulador_vencimiento: aplicaManipulador ? f.manipulador_vencimiento : "",
      consentimiento: f.consentimiento,
    };
  }

  async function pedirCodigo() {
    setError("");
    const faltan: [string, string][] = [
      [f.email, "tu correo"], [f.telefono, "tu teléfono"], [f.direccion, "tu dirección"], [f.comuna, "tu comuna"],
      [f.fecha_nacimiento, "tu fecha de nacimiento"], [nacionalidad, "tu nacionalidad"], [f.estado_civil, "tu estado civil"],
      [f.emergencia_nombre, "el nombre de tu contacto de emergencia"], [f.emergencia_parentesco, "el parentesco de tu contacto de emergencia"],
      [f.emergencia_telefono, "el teléfono de tu contacto de emergencia"],
    ];
    const falta = faltan.find(([v]) => !v.trim());
    if (falta) { setError(`Falta ${falta[1]}.`); return; }

    setEnviando(true);
    const res = await fetch(`/api/registro/${token}/codigo`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: f.email }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { setError(data.error); return; }
    setPaso("codigo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmar() {
    setError("");
    setEnviando(true);
    const res = await fetch(`/api/registro/${token}/completar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.email, codigo, ficha: ficha() }),
    });
    const data = await res.json();
    if (!res.ok) { setEnviando(false); setError(data.error); return; }

    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.auth.setSession(data.session);
    setEnviando(false);
    setPaso("listo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const boton = (activo = true): React.CSSProperties => ({
    width: "100%", padding: 15, background: AMR, color: "#1a1200", border: "none", borderRadius: 12,
    fontWeight: 800, fontSize: 19, cursor: "pointer", fontFamily: FONT, opacity: activo ? 1 : 0.6,
  });

  const cabecera = (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={120} height={42} style={{ margin: "0 auto 10px", height: "auto" }} />
    </div>
  );

  const contenedor: React.CSSProperties = { minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "28px 16px 60px" };

  if (errorLink) {
    return (
      <div style={contenedor}><div style={{ maxWidth: 480, margin: "0 auto" }}>
        {cabecera}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
          <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Link no disponible</div>
          <div style={{ color: TEXT2, fontSize: 18 }}>{errorLink}</div>
        </div>
      </div></div>
    );
  }
  if (!info) return <div style={contenedor}><div style={{ textAlign: "center", color: TEXT3 }}>Cargando…</div></div>;

  if (paso === "listo") {
    return (
      <div style={contenedor}><div style={{ maxWidth: 480, margin: "0 auto" }}>
        {cabecera}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
          <div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: VERDE, marginBottom: 8 }}>¡Listo, {info.nombre.split(" ")[0]}!</div>
          <div style={{ color: TEXT2, fontSize: 18, marginBottom: 22 }}>
            Tu ficha quedó registrada. Tu administrador completará los datos de tu contrato. Para volver a entrar, usa tu correo y te enviaremos un código.
          </div>
          <button onClick={() => router.push("/admin/mi-horario")} style={boton()}>Ver mi horario</button>
        </div>
      </div></div>
    );
  }

  if (paso === "codigo") {
    return (
      <div style={contenedor}><div style={{ maxWidth: 480, margin: "0 auto" }}>
        {cabecera}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900 }}>Confirma tu correo</div>
          <div style={{ color: TEXT2, fontSize: 17 }}>Te enviamos un código de 6 dígitos a <strong>{f.email}</strong>. Revisa también la carpeta de spam.</div>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} placeholder="000000"
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
            style={{ ...inp, fontSize: 32, textAlign: "center", letterSpacing: "0.4em" }} />
          {error && <div style={{ color: "#fca5a5", background: "#231515", border: "1px solid #6b2020", borderRadius: 8, padding: "10px 14px", fontSize: 16 }}>{error}</div>}
          <button onClick={confirmar} disabled={enviando || codigo.length < 6} style={boton(!enviando && codigo.length >= 6)}>
            {enviando ? "Enviando…" : "Confirmar y enviar mi ficha"}
          </button>
          <button onClick={() => { setPaso("form"); setCodigo(""); setError(""); }}
            style={{ background: "none", border: "none", color: TEXT3, fontSize: 16, cursor: "pointer", fontFamily: FONT }}>
            ← Cambiar correo o corregir datos
          </button>
        </div>
      </div></div>
    );
  }

  return (
    <div style={contenedor}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {cabecera}
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 28, fontWeight: 900 }}>Hola, {info.nombre.split(" ")[0]}</div>
          <div style={{ color: TEXT2, fontSize: 17, marginTop: 4 }}>
            Completa tu ficha de trabajador de Cacho Cabra. Los campos con <span style={{ color: AMR }}>*</span> son obligatorios.
          </div>
        </div>

        <Seccion titulo="Tus datos" nota="Ya los tenemos cargados; si algo está mal, avísale a tu administrador.">
          <div style={{ color: TEXT2, fontSize: 18, lineHeight: 1.5 }}>
            <div><strong>{info.nombre}</strong></div>
            <div style={{ color: TEXT3 }}>RUT {info.rut ?? "—"} · {info.cargo}</div>
          </div>
        </Seccion>

        <Seccion titulo="Contacto y domicilio">
          <Campo label="Correo electrónico" obligatorio><input type="email" value={f.email} onChange={e => set("email", e.target.value)} style={inp} placeholder="tu@correo.cl" /></Campo>
          <Campo label="Teléfono" obligatorio><input type="tel" value={f.telefono} onChange={e => set("telefono", e.target.value)} style={inp} placeholder="+56 9 1234 5678" /></Campo>
          <Campo label="Dirección" obligatorio><input value={f.direccion} onChange={e => set("direccion", e.target.value)} style={inp} placeholder="Calle y número" /></Campo>
          <Campo label="Comuna" obligatorio><input value={f.comuna} onChange={e => set("comuna", e.target.value)} style={inp} /></Campo>
          <Campo label="Fecha de nacimiento" obligatorio><input type="date" value={f.fecha_nacimiento} onChange={e => set("fecha_nacimiento", e.target.value)} style={inp} /></Campo>
          <Campo label="Nacionalidad" obligatorio><Opciones valor={f.nacionalidad} onChange={v => set("nacionalidad", v)} lista={NACIONALIDADES} /></Campo>
          {f.nacionalidad === "Otra" && <Campo label="¿Cuál?" obligatorio><input value={f.nacionalidad_otra} onChange={e => set("nacionalidad_otra", e.target.value)} style={inp} /></Campo>}
          <Campo label="Estado civil" obligatorio><Opciones valor={f.estado_civil} onChange={v => set("estado_civil", v)} lista={ESTADOS_CIVILES} /></Campo>
        </Seccion>

        <Seccion titulo="Contacto de emergencia" nota="La persona a quien avisar si te pasa algo.">
          <Campo label="Nombre" obligatorio><input value={f.emergencia_nombre} onChange={e => set("emergencia_nombre", e.target.value)} style={inp} /></Campo>
          <Campo label="Parentesco" obligatorio><Opciones valor={f.emergencia_parentesco} onChange={v => set("emergencia_parentesco", v)} lista={PARENTESCOS} /></Campo>
          <Campo label="Teléfono" obligatorio><input type="tel" value={f.emergencia_telefono} onChange={e => set("emergencia_telefono", e.target.value)} style={inp} /></Campo>
        </Seccion>

        {esExtranjero && (
          <Seccion titulo="Permiso de trabajo" nota="Opcional por ahora. Tu administrador podrá pedirte una copia.">
            <Campo label="Tipo de visa o permiso"><input value={f.visa_tipo} onChange={e => set("visa_tipo", e.target.value)} style={inp} placeholder="Ej. Residencia temporal" /></Campo>
            <Campo label="Fecha de vencimiento"><input type="date" value={f.visa_vencimiento} onChange={e => set("visa_vencimiento", e.target.value)} style={inp} /></Campo>
          </Seccion>
        )}

        <Seccion titulo="Previsión" nota="Opcional. Puedes completarlo después.">
          <Campo label="AFP"><Opciones valor={f.afp} onChange={v => set("afp", v)} lista={AFPS} /></Campo>
          <Campo label="Salud"><Opciones valor={f.salud_sistema === "fonasa" ? "Fonasa" : f.salud_sistema === "isapre" ? "Isapre" : ""} onChange={v => set("salud_sistema", v === "Fonasa" ? "fonasa" : v === "Isapre" ? "isapre" : "")} lista={["Fonasa", "Isapre"]} /></Campo>
          {f.salud_sistema === "isapre" && (<>
            <Campo label="Isapre"><Opciones valor={f.isapre_nombre} onChange={v => set("isapre_nombre", v)} lista={ISAPRES} /></Campo>
            <Campo label="Plan"><input value={f.isapre_plan} onChange={e => set("isapre_plan", e.target.value)} style={inp} /></Campo>
          </>)}
          <Campo label="¿Tienes seguro de cesantía?"><SiNo valor={f.seguro_cesantia} onChange={v => set("seguro_cesantia", v)} /></Campo>
        </Seccion>

        <Seccion titulo="Cargas familiares" nota="Opcional. Para la asignación familiar.">
          {cargas.map((c, i) => (
            <div key={i} style={{ background: SURF2, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="Nombre completo" value={c.nombre} onChange={e => setCargas(cs => cs.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} style={inp} />
              <input placeholder="RUT" value={c.rut} onChange={e => setCargas(cs => cs.map((x, j) => j === i ? { ...x, rut: e.target.value } : x))} style={inp} />
              <Opciones valor={c.parentesco} onChange={v => setCargas(cs => cs.map((x, j) => j === i ? { ...x, parentesco: v } : x))} lista={["Hijo/a", "Cónyuge o pareja", "Madre", "Padre", "Otro"]} vacio="Parentesco…" />
              <button onClick={() => setCargas(cs => cs.filter((_, j) => j !== i))} style={{ alignSelf: "flex-end", background: "none", border: "none", color: ROJO, fontSize: 15, cursor: "pointer", fontFamily: FONT }}>Quitar</button>
            </div>
          ))}
          <button onClick={() => setCargas(cs => [...cs, { nombre: "", rut: "", parentesco: "" }])}
            style={{ background: SURF2, color: TEXT2, border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 17, cursor: "pointer", fontFamily: FONT }}>
            + Agregar carga
          </button>
        </Seccion>

        <Seccion titulo="Datos bancarios" nota="Opcional. Para depositar tu sueldo.">
          <Campo label="Banco"><Opciones valor={f.banco} onChange={v => set("banco", v)} lista={BANCOS} /></Campo>
          <Campo label="Tipo de cuenta"><Opciones valor={f.tipo_cuenta} onChange={v => set("tipo_cuenta", v)} lista={TIPOS_CUENTA} /></Campo>
          <Campo label="Número de cuenta"><input inputMode="numeric" value={f.numero_cuenta} onChange={e => set("numero_cuenta", e.target.value)} style={inp} /></Campo>
        </Seccion>

        {aplicaManipulador && (
          <Seccion titulo="Manipulación de alimentos" nota="Opcional.">
            <Campo label="¿Tienes curso de manipulador de alimentos?"><SiNo valor={f.manipulador_alimentos} onChange={v => set("manipulador_alimentos", v)} /></Campo>
            {f.manipulador_alimentos === "Sí" && <Campo label="Vigente hasta"><input type="date" value={f.manipulador_vencimiento} onChange={e => set("manipulador_vencimiento", e.target.value)} style={inp} /></Campo>}
          </Seccion>
        )}

        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", color: TEXT2, fontSize: 16, lineHeight: 1.45, cursor: "pointer" }}>
          <input type="checkbox" checked={f.consentimiento} onChange={e => set("consentimiento", e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, accentColor: AMR }} />
          Autorizo a Cacho Cabra a usar mis datos personales para la gestión de mi relación laboral (contrato, remuneraciones, previsión y contacto de emergencia).
        </label>

        {error && <div style={{ color: "#fca5a5", background: "#231515", border: "1px solid #6b2020", borderRadius: 8, padding: "10px 14px", fontSize: 16 }}>{error}</div>}
        <button onClick={pedirCodigo} disabled={enviando} style={boton(!enviando)}>{enviando ? "Enviando código…" : "Continuar"}</button>
        <div style={{ textAlign: "center", color: TEXT3, fontSize: 15 }}>Te enviaremos un código a tu correo para confirmar tu identidad.</div>
      </div>
    </div>
  );
}
