"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, AZUL, FONT, TITLE } from "../../../../lib/tokens";
import { ESTADO_LABEL, type EstadoTrabajador } from "../../../../lib/fichas";

interface Trabajador {
  id: string; nombre: string; rut: string | null; cargo: string | null; departamento: string;
  estado: EstadoTrabajador; telefono: string | null;
}

const COLOR_ESTADO: Record<EstadoTrabajador, string> = {
  sin_invitar: TEXT3, invitado: AZUL, vencida: ROJO, registrado: AMR, completa: VERDE,
};

export default function TrabajadoresPage() {
  const [lista, setLista] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);

  async function cargar() {
    const res = await fetch("/api/trabajadores");
    if (res.ok) setLista(await res.json());
    setLoading(false);
  }
  useEffect(() => { (async () => { await cargar(); })(); }, []);

  function abrir(t: Trabajador) {
    setError(""); setLink(null);
    setTelefono(t.telefono ? t.telefono.replace(/^56/, "") : "");
    setAbierto(abierto === t.id ? null : t.id);
  }

  async function invitar(t: Trabajador) {
    setError("");
    setEnviando(true);
    // La pestaña se abre ahora (con el clic) para que el navegador no bloquee el popup.
    const ventana = window.open("", "_blank");
    const res = await fetch(`/api/trabajadores/${t.id}/invitar`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) { ventana?.close(); setError(data.error); return; }

    const url = `${window.location.origin}/registro/${data.token}`;
    const mensaje = `Hola ${t.nombre.split(" ")[0]}, te invitamos a completar tu ficha de trabajador en Cacho Cabra. Ingresa aquí: ${url} (el link vence en ${data.dias} días).`;
    const wa = `https://wa.me/${data.telefono}?text=${encodeURIComponent(mensaje)}`;
    if (ventana) ventana.location.href = wa;
    setLink({ id: t.id, url });
    await cargar();
  }

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", color: TEXT1, fontFamily: FONT, fontSize: 17 };
  const pendientes = lista.filter(t => t.estado === "registrado").length;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Trabajadores</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {lista.length} trabajadores{pendientes > 0 && <> · <span style={{ color: AMR, fontWeight: 700 }}>{pendientes} con el contrato por completar</span></>}
          </div>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? <div style={{ padding: 20, color: TEXT3 }}>Cargando…</div> : lista.map((t, idx) => (
            <div key={t.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{t.nombre}</div>
                  <div style={{ fontSize: 15, color: TEXT3 }}>{t.cargo} · RUT {t.rut ?? "—"}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLOR_ESTADO[t.estado], border: `1px solid ${COLOR_ESTADO[t.estado]}`, borderRadius: 999, padding: "3px 12px" }}>
                  {ESTADO_LABEL[t.estado]}
                </span>
                {(t.estado === "sin_invitar" || t.estado === "vencida" || t.estado === "invitado") && (
                  <button onClick={() => abrir(t)} style={{ background: abierto === t.id ? AMR : SURF2, color: abierto === t.id ? "#1a1200" : TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                    {t.estado === "invitado" ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
                  </button>
                )}
                {(t.estado === "registrado" || t.estado === "completa") && (
                  <Link href={`/admin/trabajadores/${t.id}`} style={{ background: t.estado === "registrado" ? AMR : SURF2, color: t.estado === "registrado" ? "#1a1200" : TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                    {t.estado === "registrado" ? "Completar contrato" : "Ver ficha"}
                  </Link>
                )}
              </div>

              {abierto === t.id && (
                <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 15, color: TEXT3 }}>Teléfono de {t.nombre.split(" ")[0]} (WhatsApp). Se abrirá WhatsApp con el mensaje listo para enviar.</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: TEXT2, fontSize: 17 }}>+56</span>
                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="9 1234 5678" style={{ ...inp, width: 200 }} />
                    <button onClick={() => invitar(t)} disabled={enviando}
                      style={{ background: VERDE, color: "#062018", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: FONT, opacity: enviando ? 0.6 : 1 }}>
                      {enviando ? "Generando…" : "Abrir WhatsApp"}
                    </button>
                  </div>
                  {error && <div style={{ color: ROJO, fontSize: 15 }}>{error}</div>}
                  {link?.id === t.id && (
                    <div style={{ fontSize: 15, color: TEXT2 }}>
                      Si WhatsApp no se abrió, copia este link y envíalo tú:
                      <div style={{ background: SURF2, borderRadius: 8, padding: "8px 12px", marginTop: 6, wordBreak: "break-all", color: TEXT1 }}>{link.url}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
