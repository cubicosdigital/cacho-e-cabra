"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

interface Notificacion { id: string; tipo: string; titulo: string; mensaje: string | null; empleado_id: string | null; leida: boolean; created_at: string }

function cuando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificacionesPage() {
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    const res = await fetch("/api/notificaciones");
    if (res.ok) setLista(await res.json());
    setLoading(false);
  }
  useEffect(() => { (async () => { await cargar(); })(); }, []);

  async function marcar(id?: string) {
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await cargar();
  }

  const sinLeer = lista.filter(n => !n.leida).length;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Notificaciones</div>
            <div style={{ fontSize: 17, color: TEXT3 }}>{sinLeer > 0 ? `${sinLeer} sin leer` : "Todo al día"}</div>
          </div>
          {sinLeer > 0 && (
            <button onClick={() => marcar()} style={{ background: SURF2, color: TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 16, cursor: "pointer", fontFamily: FONT }}>
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? <div style={{ padding: 20, color: TEXT3 }}>Cargando…</div> : lista.length === 0 ? (
            <div style={{ padding: 20, color: TEXT3 }}>Aún no hay notificaciones.</div>
          ) : lista.map((n, idx) => (
            <div key={n.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 20px", borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`, opacity: n.leida ? 0.6 : 1 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: n.leida ? "transparent" : AMR, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{n.titulo}</div>
                {n.mensaje && <div style={{ fontSize: 16, color: TEXT2 }}>{n.mensaje}</div>}
                <div style={{ fontSize: 14, color: TEXT3, marginTop: 2 }}>{cuando(n.created_at)}</div>
              </div>
              {n.empleado_id && (
                <Link href={`/admin/trabajadores/${n.empleado_id}`} onClick={() => !n.leida && marcar(n.id)}
                  style={{ background: n.leida ? SURF2 : AMR, color: n.leida ? TEXT2 : "#1a1200", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                  Ver ficha
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
