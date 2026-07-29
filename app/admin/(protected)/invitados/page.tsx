"use client";
import { useEffect, useMemo, useState } from "react";
import type { Registro } from "../../../../lib/registros";
import type { Evento } from "../../../../lib/eventos";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, FONT, TITLE } from "../../../../lib/tokens";

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

/** Deja el número listo para wa.me: solo dígitos y con el 56 de Chile por delante. */
function normalizarTelefono(tel: string) {
  const soloDigitos = tel.replace(/\D/g, "");
  if (soloDigitos.startsWith("56")) return soloDigitos;
  if (soloDigitos.startsWith("9") && soloDigitos.length === 9) return `56${soloDigitos}`;
  return soloDigitos;
}

export default function InvitadosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [eventoId, setEventoId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [rEventos, rRegistros] = await Promise.all([
        fetch("/api/eventos"),
        fetch("/api/eventos/registro"),
      ]);
      if (rEventos.ok) {
        const data: Evento[] = await rEventos.json();
        setEventos(data);
        if (data.length > 0) setEventoId(data[0].id);
      }
      if (rRegistros.ok) {
        const data = await rRegistros.json();
        setRegistros(Array.isArray(data.registros) ? data.registros : []);
      } else {
        setError("No se pudo cargar la lista de invitados");
      }
      setLoading(false);
    })();
  }, []);

  const evento = eventos.find(e => e.id === eventoId) ?? null;
  const delEvento = useMemo(
    () => registros.filter(r => r.evento_id === eventoId),
    [registros, eventoId]
  );

  const totalPersonas = delEvento.reduce((s, r) => s + r.personas, 0);
  const pagados = delEvento.filter(r => r.pagado);
  const recaudado = evento ? pagados.reduce((s, r) => s + r.personas * evento.precio, 0) : 0;

  async function patch(id: string, body: { pagado?: boolean; confirmado?: boolean }) {
    setError(null);
    const previo = registros;
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, ...body } : r));
    const res = await fetch(`/api/eventos/registro/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setRegistros(previo);
      setError("No se pudo guardar el cambio");
    }
  }

  function whatsapp(r: Registro) {
    const tel = normalizarTelefono(r.telefono);
    const texto = evento
      ? `Hola ${r.nombre}, te escribimos de Cacho Cabra por tu registro en "${evento.titulo}" (${evento.fecha}, ${evento.hora} hrs).`
      : `Hola ${r.nombre}, te escribimos de Cacho Cabra por tu registro.`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Invitados por evento</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            Confirma pagos y escribe por WhatsApp a los registrados.
          </div>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        <select value={eventoId} onChange={e => setEventoId(e.target.value)} style={{
          background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "11px 16px",
          fontSize: 18, fontFamily: FONT, color: TEXT1, maxWidth: 480,
        }}>
          {eventos.map(e => (
            <option key={e.id} value={e.id}>{e.emoji} {e.titulo} · {e.fechaCorta} {e.mes}</option>
          ))}
        </select>

        {evento && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {[
              { label: "Registros", valor: String(delEvento.length) },
              { label: "Personas", valor: `${totalPersonas} de ${evento.cupos}` },
              { label: "Pagados", valor: `${pagados.length} de ${delEvento.length}` },
              { label: "Recaudado", valor: fmt(recaudado) },
            ].map(c => (
              <div key={c.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ fontSize: 14, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: AMR, fontFamily: TITLE }}>{c.valor}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {delEvento.map((r, idx) => (
              <div key={r.id} style={{
                padding: "14px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`,
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 19 }}>{r.nombre}</span>
                    <span style={{ fontSize: 15, color: TEXT3, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>
                      {r.personas} {r.personas === 1 ? "persona" : "personas"}
                    </span>
                    {r.pagado && (
                      <span style={{ fontSize: 15, color: VERDE, background: "#1a2e1a", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>Pagado</span>
                    )}
                  </div>
                  <div style={{ fontSize: 16, color: TEXT2, marginTop: 2 }}>
                    {r.telefono} · {r.email}
                  </div>
                  <div style={{ fontSize: 14, color: TEXT3, marginTop: 2 }}>
                    Registrado el {new Date(r.fecha_registro).toLocaleDateString("es-CL", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <a href={whatsapp(r)} target="_blank" rel="noopener noreferrer" style={{
                  flexShrink: 0, background: "#1a2e1a", color: VERDE, borderRadius: 8,
                  padding: "8px 14px", fontSize: 15, fontWeight: 700, textDecoration: "none",
                }}>
                  WhatsApp
                </a>

                <button onClick={() => patch(r.id, { pagado: !r.pagado })} title="Marcar solo si verificaste la transferencia" style={{
                  flexShrink: 0, fontSize: 15, fontWeight: 700, borderRadius: 8, padding: "8px 14px",
                  border: "none", cursor: "pointer", fontFamily: FONT,
                  background: r.pagado ? "#1a2e1a" : AMR, color: r.pagado ? VERDE : "#1a1200",
                }}>
                  {r.pagado ? "✓ Pago verificado" : "Marcar como pagado"}
                </button>
              </div>
            ))}
            {delEvento.length === 0 && (
              <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>
                Todavía no hay registrados en este evento
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
