"use client";
import { useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

interface Mesa {
  id: string; numero: number; capacidad: number; zona: string; forma: "cuad" | "redonda" | "barra";
  x: number; y: number; w: number; h: number;
}

const ZONAS = ["Salón", "Terraza", "Barra", "Escenario", "VIP"];
const FORMAS: Mesa["forma"][] = ["cuad", "redonda", "barra"];

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nueva, setNueva] = useState({ numero: "", capacidad: "4", zona: ZONAS[0], forma: "cuad" as Mesa["forma"] });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/mesas");
      if (res.ok) setMesas(await res.json());
      setLoading(false);
    })();
  }, []);

  async function guardarTodo(next: Mesa[]) {
    setSaving(true);
    setMesas(next);
    await fetch("/api/mesas", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesas: next.map(m => ({ numero: m.numero, capacidad: m.capacidad, zona: m.zona, forma: m.forma, x: m.x, y: m.y, w: m.w, h: m.h })),
      }),
    });
    setSaving(false);
  }

  function agregar() {
    const numero = parseInt(nueva.numero, 10);
    if (!numero || mesas.some(m => m.numero === numero)) return;
    const nuevaMesa: Mesa = {
      id: `tmp-${Date.now()}`, numero, capacidad: parseInt(nueva.capacidad, 10) || 4,
      zona: nueva.zona, forma: nueva.forma, x: 0, y: 0, w: 60, h: 60,
    };
    guardarTodo([...mesas, nuevaMesa].sort((a, b) => a.numero - b.numero));
    setNueva({ numero: "", capacidad: "4", zona: nueva.zona, forma: "cuad" });
  }

  function actualizar(id: string, campo: keyof Mesa, valor: string | number) {
    guardarTodo(mesas.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  }

  function eliminar(id: string) {
    guardarTodo(mesas.filter(m => m.id !== id));
  }

  const totalCapacidad = mesas.reduce((s, m) => s + m.capacidad, 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Mesas</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>{mesas.length} mesas · {totalCapacidad} personas de capacidad {saving && "· guardando…"}</div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {ZONAS.filter(z => mesas.some(m => m.zona === z)).map(zona => (
              <div key={zona}>
                <div style={{ padding: "12px 20px", background: SURF2, fontSize: 16, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{zona}</div>
                {mesas.filter(m => m.zona === zona).map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
                    <span style={{ fontWeight: 800, fontSize: 19, width: 70 }}>Mesa {m.numero}</span>
                    <select value={m.forma} onChange={e => actualizar(m.id, "forma", e.target.value)}
                      style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 }}>
                      {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={m.zona} onChange={e => actualizar(m.id, "zona", e.target.value)}
                      style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 }}>
                      {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                      <button onClick={() => actualizar(m.id, "capacidad", Math.max(1, m.capacidad - 1))}
                        style={{ width: 28, height: 28, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT1, cursor: "pointer" }}>−</button>
                      <span style={{ fontWeight: 700, color: AMR, minWidth: 20, textAlign: "center" }}>{m.capacidad}</span>
                      <button onClick={() => actualizar(m.id, "capacidad", m.capacidad + 1)}
                        style={{ width: 28, height: 28, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT1, cursor: "pointer" }}>+</button>
                    </div>
                    <button onClick={() => eliminar(m.id)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 20 }}>🗑</button>
                  </div>
                ))}
              </div>
            ))}
            {mesas.length === 0 && <div style={{ padding: 24, color: TEXT3, textAlign: "center" }}>Sin mesas registradas</div>}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>+ Agregar mesa</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input type="number" placeholder="N°" value={nueva.numero} onChange={e => setNueva(n => ({ ...n, numero: e.target.value }))}
              style={{ width: 80, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <input type="number" placeholder="Capacidad" value={nueva.capacidad} onChange={e => setNueva(n => ({ ...n, capacidad: e.target.value }))}
              style={{ width: 110, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }} />
            <select value={nueva.zona} onChange={e => setNueva(n => ({ ...n, zona: e.target.value }))}
              style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }}>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select value={nueva.forma} onChange={e => setNueva(n => ({ ...n, forma: e.target.value as Mesa["forma"] }))}
              style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT1, fontFamily: FONT }}>
              {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button onClick={agregar} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
