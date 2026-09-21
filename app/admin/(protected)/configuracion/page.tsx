"use client";
import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../lib/tokens";
import { ROL_LABEL, ROLES_CREABLES, type Rol } from "../../../../lib/roles";
import { ACCIONES, MODULOS, PERMISOS_POR_ROL, accionesDe, permisosEfectivos, type Accion, type Permisos, type PermisosGuardados } from "../../../../lib/permisos";

interface Perfil {
  id: string; email: string; nombre: string; rol: Rol; permisos: { pos?: boolean };
  telefono: string | null; rut: string | null; direccion: string | null; comuna: string | null; fecha_nacimiento: string | null;
  contacto_emergencia_nombre: string | null; contacto_emergencia_telefono: string | null;
}
interface Cuenta { id: string; email: string; nombre: string; rol: Rol; activo: boolean; permisos: PermisosGuardados; telefono: string | null; empleado: string | null }
interface EmpleadoSimple { id: string; nombre: string; usuario_admin_id: string | null }

const tarjeta: React.CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22 };
const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17, width: "100%", boxSizing: "border-box" };

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block" }}><div style={{ fontSize: 13, color: TEXT3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>{children}</label>;
}
const boton = (activo = true, principal = true): React.CSSProperties => ({
  background: principal ? AMR : SURF2, color: principal ? "#1a1200" : TEXT2, border: principal ? "none" : `1px solid ${BORDER}`,
  borderRadius: 8, padding: "10px 22px", fontSize: 16, fontWeight: 700, cursor: activo ? "pointer" : "not-allowed", fontFamily: FONT, opacity: activo ? 1 : 0.55,
});
function Aviso({ ok, texto }: { ok: boolean; texto: string }) { return <div style={{ color: ok ? VERDE : ROJO, fontSize: 16 }}>{texto}</div>; }

/* ─────────── Mi perfil ─────────── */
function MiPerfil({ perfil, onGuardado }: { perfil: Perfil; onGuardado: (p: Perfil) => void }) {
  const [f, setF] = useState({
    nombre: perfil.nombre, telefono: perfil.telefono ?? "", rut: perfil.rut ?? "", fecha_nacimiento: perfil.fecha_nacimiento ?? "",
    direccion: perfil.direccion ?? "", comuna: perfil.comuna ?? "",
    contacto_emergencia_nombre: perfil.contacto_emergencia_nombre ?? "", contacto_emergencia_telefono: perfil.contacto_emergencia_telefono ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));

  async function guardar() {
    setGuardando(true); setMsg(null);
    const res = await fetch("/api/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setGuardando(false);
    if (res.ok) { onGuardado(d); setMsg({ ok: true, texto: "Cambios guardados." }); } else setMsg({ ok: false, texto: d.error });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Mi perfil</div>
        <div style={{ fontSize: 15, color: TEXT3, marginBottom: 16 }}>{perfil.email} · <strong style={{ color: AMR }}>{ROL_LABEL[perfil.rol]}</strong> (el correo y el rol los define un administrador)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <Campo label="Nombre completo"><input value={f.nombre} onChange={e => set("nombre", e.target.value)} style={inp} /></Campo>
          <Campo label="Teléfono"><input type="tel" value={f.telefono} onChange={e => set("telefono", e.target.value)} style={inp} placeholder="+56 9 1234 5678" /></Campo>
          <Campo label="RUT"><input value={f.rut} onChange={e => set("rut", e.target.value)} style={inp} placeholder="12.345.678-9" /></Campo>
          <Campo label="Fecha de nacimiento"><input type="date" value={f.fecha_nacimiento} onChange={e => set("fecha_nacimiento", e.target.value)} style={inp} /></Campo>
          <Campo label="Dirección"><input value={f.direccion} onChange={e => set("direccion", e.target.value)} style={inp} /></Campo>
          <Campo label="Comuna"><input value={f.comuna} onChange={e => set("comuna", e.target.value)} style={inp} /></Campo>
        </div>
      </div>
      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Contacto de emergencia</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <Campo label="Nombre"><input value={f.contacto_emergencia_nombre} onChange={e => set("contacto_emergencia_nombre", e.target.value)} style={inp} /></Campo>
          <Campo label="Teléfono"><input type="tel" value={f.contacto_emergencia_telefono} onChange={e => set("contacto_emergencia_telefono", e.target.value)} style={inp} /></Campo>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button onClick={guardar} disabled={guardando} style={boton(!guardando)}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
        {msg && <Aviso {...msg} />}
      </div>
    </div>
  );
}

/* ─────────── Seguridad: cambiar contraseña con código al correo ─────────── */
function Seguridad({ correo }: { correo: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState<"inicio" | "codigo" | "listo">("inicio");
  const [codigo, setCodigo] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [ver, setVer] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function pedirCodigo() {
    setTrabajando(true); setMsg(null);
    const res = await fetch("/api/perfil/password/codigo", { method: "POST" });
    const d = await res.json();
    setTrabajando(false);
    if (res.ok) setPaso("codigo"); else setMsg({ ok: false, texto: d.error });
  }

  async function cambiar() {
    if (pass !== pass2) { setMsg({ ok: false, texto: "Las dos contraseñas no coinciden." }); return; }
    setTrabajando(true); setMsg(null);
    const res = await fetch("/api/perfil/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo, password: pass }) });
    const d = await res.json();
    setTrabajando(false);
    if (res.ok) {
      setPaso("listo"); setCodigo(""); setPass(""); setPass2("");
      // Al cambiar la contraseña, Supabase cierra las sesiones abiertas: se avisa y se lleva a iniciar sesión de nuevo.
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await supabase.auth.signOut();
      setTimeout(() => { router.push("/admin/login"); router.refresh(); }, 4000);
    } else setMsg({ ok: false, texto: d.error });
  }

  const reglas = [["Al menos 8 caracteres", pass.length >= 8], ["Letras y números", /[A-Za-z]/.test(pass) && /\d/.test(pass)], ["Las dos coinciden", pass.length > 0 && pass === pass2]] as const;

  return (
    <div style={{ ...tarjeta, maxWidth: 560 }}>
      <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Cambiar contraseña</div>
      {paso === "inicio" && (
        <>
          <div style={{ fontSize: 16, color: TEXT2, marginBottom: 16 }}>Por seguridad, te enviaremos un código de 6 dígitos a <strong>{correo}</strong>. Con ese código podrás elegir tu nueva contraseña.</div>
          <button onClick={pedirCodigo} disabled={trabajando} style={boton(!trabajando)}>{trabajando ? "Enviando…" : "Enviarme el código"}</button>
        </>
      )}
      {paso === "codigo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 16, color: TEXT2 }}>Enviamos el código a <strong>{correo}</strong>. Revisa también la carpeta de spam.</div>
          <Campo label="Código de 6 dígitos"><input inputMode="numeric" maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))} style={{ ...inp, textAlign: "center", letterSpacing: "0.4em", fontSize: 24 }} placeholder="000000" /></Campo>
          <Campo label="Nueva contraseña"><input type={ver ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} style={inp} autoComplete="new-password" /></Campo>
          <Campo label="Repite la nueva contraseña"><input type={ver ? "text" : "password"} value={pass2} onChange={e => setPass2(e.target.value)} style={inp} autoComplete="new-password" /></Campo>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: TEXT2, fontSize: 15, cursor: "pointer" }}>
            <input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} style={{ width: 18, height: 18, accentColor: AMR }} /> Mostrar contraseña
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 15 }}>
            {reglas.map(([t, ok]) => <span key={t} style={{ color: ok ? VERDE : TEXT3 }}>{ok ? "✓" : "○"} {t}</span>)}
          </div>
          {msg && <Aviso {...msg} />}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={cambiar} disabled={trabajando || codigo.length < 6 || !reglas.every(r => r[1])} style={boton(!trabajando && codigo.length >= 6 && reglas.every(r => r[1]))}>{trabajando ? "Cambiando…" : "Cambiar contraseña"}</button>
            <button onClick={pedirCodigo} disabled={trabajando} style={boton(!trabajando, false)}>Reenviar código</button>
          </div>
        </div>
      )}
      {paso === "listo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: VERDE, fontSize: 18, fontWeight: 700 }}>Tu contraseña quedó actualizada.</div>
          <div style={{ fontSize: 16, color: TEXT2 }}>Por seguridad cerramos tu sesión. En unos segundos te llevamos a iniciar sesión con tu nueva contraseña.</div>
          <button onClick={() => { router.push("/admin/login"); router.refresh(); }} style={{ ...boton(true), alignSelf: "flex-start" }}>Iniciar sesión ahora</button>
        </div>
      )}
      {paso === "inicio" && msg && <div style={{ marginTop: 12 }}><Aviso {...msg} /></div>}
    </div>
  );
}

/* ─────────── Usuarios (solo administrador) ─────────── */
function Usuarios({ yoId }: { yoId: string }) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoSimple[]>([]);
  const [f, setF] = useState({ nombre: "", email: "", telefono: "", rol: "mesero" as Rol, empleado_id: "" });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [creado, setCreado] = useState<{ nombre: string; email: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    const [c, e] = await Promise.all([fetch("/api/usuarios-admin"), fetch("/api/empleados")]);
    if (c.ok) setCuentas(await c.json());
    if (e.ok) setEmpleados(await e.json());
  }, []);
  useEffect(() => { (async () => { await cargar(); })(); }, [cargar]);

  async function crear() {
    setMsg(null); setCreado(null);
    const res = await fetch("/api/usuarios-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, empleado_id: f.empleado_id || null }) });
    const d = await res.json();
    if (!res.ok) { setMsg({ ok: false, texto: d.error }); return; }
    setCreado({ nombre: d.nombre, email: d.email });
    setF({ nombre: "", email: "", telefono: "", rol: "mesero", empleado_id: "" });
    await cargar();
  }

  async function cambiar(id: string, cambios: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch(`/api/usuarios-admin/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
    if (!res.ok) setMsg({ ok: false, texto: (await res.json()).error });
    await cargar();
  }

  const instrucciones = creado
    ? `Hola ${creado.nombre.split(" ")[0]}, te creamos un acceso al sistema de Cacho Cabra. Entra a ${window.location.origin}/admin/login, pulsa «Soy trabajador: entrar con código», escribe ${creado.email} y luego el código que te llegará al correo.`
    : "";

  const libres = empleados.filter(e => !e.usuario_admin_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 8px" }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>Usuarios del sistema</div>
          <div style={{ fontSize: 15, color: TEXT3 }}>Quién puede entrar y qué ve cada uno según su rol.</div>
        </div>
        {cuentas.map(c => {
          const soyYo = c.id === yoId;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap", opacity: c.activo ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{c.nombre}{soyYo && <span style={{ color: AMR, fontSize: 14 }}> · tú</span>}</div>
                <div style={{ fontSize: 14, color: TEXT3 }}>{c.email}{c.empleado && ` · trabajador: ${c.empleado}`}</div>
              </div>
              <select value={c.rol} disabled={soyYo} onChange={e => cambiar(c.id, { rol: e.target.value })} style={{ ...inp, width: 170 }}>
                {[...new Set<Rol>([...ROLES_CREABLES, c.rol])].map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
              <button disabled={soyYo} onClick={() => cambiar(c.id, { activo: !c.activo })} style={{ ...boton(!soyYo, false), padding: "8px 16px", color: c.activo ? TEXT2 : VERDE }}>{c.activo ? "Desactivar" : "Activar"}</button>
            </div>
          );
        })}
      </div>

      <div style={tarjeta}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Crear usuario</div>
        <div style={{ fontSize: 15, color: TEXT3, marginBottom: 16 }}>Entra con su correo y un código que le llega al correo. No necesita contraseña.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
          <Campo label="Nombre completo"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} style={inp} /></Campo>
          <Campo label="Correo"><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={inp} /></Campo>
          <Campo label="Teléfono (opcional)"><input type="tel" value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} style={inp} /></Campo>
          <Campo label="Rol">
            <select value={f.rol} onChange={e => setF({ ...f, rol: e.target.value as Rol })} style={inp}>
              {ROLES_CREABLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </Campo>
          <Campo label="Vincular con trabajador (opcional)">
            <select value={f.empleado_id} onChange={e => setF({ ...f, empleado_id: e.target.value })} style={inp}>
              <option value="">Ninguno</option>
              {libres.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={crear} disabled={!f.nombre || !f.email} style={boton(!!f.nombre && !!f.email)}>Crear usuario</button>
          {msg && <Aviso {...msg} />}
        </div>
        {creado && (
          <div style={{ marginTop: 16, background: SURF2, borderRadius: 10, padding: 14 }}>
            <div style={{ color: VERDE, fontWeight: 700, marginBottom: 6 }}>Usuario creado: {creado.nombre}</div>
            <div style={{ fontSize: 15, color: TEXT2, marginBottom: 10 }}>{instrucciones}</div>
            <button onClick={async () => { await navigator.clipboard.writeText(instrucciones); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} style={{ ...boton(true, false), padding: "8px 16px" }}>{copiado ? "¡Copiado!" : "Copiar instrucciones"}</button>
          </div>
        )}
      </div>

    </div>
  );
}


/* ─────────── Permisos por módulo (solo administrador) ─────────── */
function PermisosTab() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [sel, setSel] = useState<string>("");
  const [edit, setEdit] = useState<Permisos>({});
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/usuarios-admin");
    if (res.ok) setCuentas(await res.json());
  }, []);
  useEffect(() => { (async () => { await cargar(); })(); }, [cargar]);

  const editables = cuentas.filter(c => c.rol !== "admin");
  const cuenta = cuentas.find(c => c.id === sel);

  function elegir(id: string) {
    const c = cuentas.find(x => x.id === id);
    setSel(id); setMsg(null); setSucio(false);
    setEdit(c ? { ...permisosEfectivos(c.rol, c.permisos) } : {});
  }

  function alternar(modulo: (typeof MODULOS)[number]["k"], a: Accion) {
    setSucio(true); setMsg(null);
    setEdit(prev => {
      const actual = new Set(prev[modulo] ?? []);
      if (actual.has(a)) { actual.delete(a); if (a === "r") actual.clear(); }
      else { actual.add(a); if (a !== "r" && accionesDe(modulo).includes("r")) actual.add("r"); }
      return { ...prev, [modulo]: ACCIONES.map(x => x.k).filter(x => actual.has(x)) };
    });
  }

  async function enviar(cuerpo: Record<string, unknown>, ok: string) {
    if (!cuenta) return;
    setGuardando(true); setMsg(null);
    const res = await fetch(`/api/usuarios-admin/${cuenta.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const d = await res.json();
    setGuardando(false);
    if (!res.ok) { setMsg({ ok: false, texto: d.error }); return; }
    await cargar();
    setEdit({ ...permisosEfectivos(d.rol, d.permisos) }); setSucio(false); setMsg({ ok: true, texto: ok });
  }

  const grupos = [...new Set(MODULOS.map(m => m.grupo))];
  const diferenteAlRol = cuenta ? JSON.stringify(permisosEfectivos(cuenta.rol, cuenta.permisos)) !== JSON.stringify(PERMISOS_POR_ROL[cuenta.rol]) : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...tarjeta, padding: 20 }}>
        <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Permisos por usuario</div>
        <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>
          Elige a una persona y marca qué puede hacer en cada módulo: <strong style={{ color: TEXT2 }}>Crear, Ver, Editar y Borrar</strong>. Los administradores siempre tienen acceso total. El dashboard, el terminal ZK, los usuarios y las notificaciones son solo de administradores.
        </div>
        <select value={sel} onChange={e => elegir(e.target.value)} style={{ ...inp, maxWidth: 420 }}>
          <option value="">Selecciona un usuario…</option>
          {editables.map(c => <option key={c.id} value={c.id}>{c.nombre} · {ROL_LABEL[c.rol]}{c.activo ? "" : " (inactivo)"}</option>)}
        </select>
        {editables.length === 0 && <div style={{ color: TEXT3, fontSize: 15, marginTop: 10 }}>Todavía no hay usuarios que no sean administradores. Créalos en la pestaña Usuarios o invítalos desde Trabajadores.</div>}
      </div>

      {cuenta && (
        <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontFamily: TITLE, fontSize: 19, fontWeight: 900 }}>{cuenta.nombre}</div>
              <div style={{ fontSize: 14, color: TEXT3 }}>{cuenta.email} · rol {ROL_LABEL[cuenta.rol]}{diferenteAlRol && <span style={{ color: AMR }}> · permisos personalizados</span>}</div>
            </div>
            <button onClick={() => enviar({ restablecer: true }, `Permisos restablecidos a lo habitual de ${ROL_LABEL[cuenta.rol]}.`)} disabled={guardando || !diferenteAlRol} style={boton(!guardando && diferenteAlRol, false)}>Restablecer al rol</button>
            <button onClick={() => enviar({ modulos: edit }, "Permisos guardados.")} disabled={guardando || !sucio} style={boton(!guardando && sucio)}>{guardando ? "Guardando…" : "Guardar permisos"}</button>
          </div>
          {msg && <div style={{ padding: "0 22px 12px" }}><Aviso {...msg} /></div>}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) repeat(4, 76px)", alignItems: "center", padding: "8px 22px", borderTop: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Módulo</div>{ACCIONES.map(a => <div key={a.k} style={{ textAlign: "center" }}>{a.label}</div>)}
          </div>
          {grupos.map(g => (
            <div key={g}>
              <div style={{ padding: "8px 22px 4px", background: SURF2, fontSize: 13, fontWeight: 800, color: AMR, textTransform: "uppercase", letterSpacing: "0.06em" }}>{g}</div>
              {MODULOS.filter(m => m.grupo === g).map(m => {
                const validas = accionesDe(m.k);
                return (
                  <div key={m.k} style={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) repeat(4, 76px)", alignItems: "center", padding: "10px 22px", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{m.label}</div>
                    {ACCIONES.map(a => (
                      <div key={a.k} style={{ textAlign: "center" }}>
                        {validas.includes(a.k)
                          ? <input type="checkbox" checked={edit[m.k]?.includes(a.k) ?? false} onChange={() => alternar(m.k, a.k)} aria-label={`${m.label}: ${a.label}`} style={{ width: 22, height: 22, accentColor: AMR, cursor: "pointer" }} />
                          : <span style={{ color: BORDER }}>—</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ padding: "12px 22px", fontSize: 14, color: TEXT3, borderTop: `1px solid ${BORDER}` }}>
            Al marcar Crear, Editar o Borrar se marca también Ver. Todo el mundo puede ver su propio horario y cambiar su contraseña.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Página ─────────── */
export default function ConfiguracionPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"perfil" | "seguridad" | "usuarios" | "permisos">("perfil");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/perfil");
      if (res.ok) setPerfil(await res.json()); else setError((await res.json().catch(() => ({}))).error ?? "No se pudo cargar tu perfil");
    })();
  }, []);

  if (error) return <div style={{ minHeight: "100vh", background: BG, color: ROJO, fontFamily: FONT, padding: 40 }}>{error}</div>;
  if (!perfil) return <div style={{ minHeight: "100vh", background: BG, color: TEXT3, fontFamily: FONT, padding: 40 }}>Cargando…</div>;

  const tabs = [["perfil", "Mi perfil"], ["seguridad", "Seguridad"], ...(perfil.rol === "admin" ? [["usuarios", "Usuarios"], ["permisos", "Permisos"]] : [])] as [typeof tab, string][];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(2); opacity: 1; width: 26px; height: 26px; cursor: pointer; }`}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Configuración</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{perfil.nombre} · {ROL_LABEL[perfil.rol]}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? AMR : SURF2, color: tab === k ? "#1a1200" : TEXT2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "8px 22px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{l}</button>
          ))}
        </div>
        {tab === "perfil" && <MiPerfil perfil={perfil} onGuardado={setPerfil} />}
        {tab === "seguridad" && <Seguridad correo={perfil.email} />}
        {tab === "usuarios" && perfil.rol === "admin" && <Usuarios yoId={perfil.id} />}
        {tab === "permisos" && perfil.rol === "admin" && <PermisosTab />}
      </div>
    </div>
  );
}
