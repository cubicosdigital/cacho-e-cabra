"use client";
import { useEffect, useState } from "react";
import type { PedidoDelivery, EstadoDelivery, ItemDelivery } from "../../../../lib/delivery";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, AZUL, ROJO, FONT, TITLE } from "../../../../lib/tokens";

const COLUMNAS: { value: EstadoDelivery; label: string; color: string; next?: EstadoDelivery }[] = [
  { value: "recibido", label: "Recibido", color: ROJO, next: "preparando" },
  { value: "preparando", label: "Preparando", color: AMR, next: "en_camino" },
  { value: "en_camino", label: "En camino", color: AZUL, next: "entregado" },
  { value: "entregado", label: "Entregado", color: VERDE },
];

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

const inputBase: React.CSSProperties = {
  background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16,
};

type Borrador = {
  cliente: string; telefono: string; direccion: string; referencia: string;
  despacho: string; notas: string; items: { nombre: string; cantidad: string; precio: string }[];
};

const BORRADOR_VACIO: Borrador = {
  cliente: "", telefono: "", direccion: "", referencia: "",
  despacho: "", notas: "", items: [{ nombre: "", cantidad: "1", precio: "" }],
};

export default function DeliveryPage() {
  const [pedidos, setPedidos] = useState<PedidoDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Borrador>(BORRADOR_VACIO);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const res = await fetch("/api/delivery");
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function cambiarEstado(id: string, estado: EstadoDelivery) {
    const previo = pedidos;
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    const res = await fetch(`/api/delivery/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) { setPedidos(previo); setError("No se pudo actualizar el pedido"); }
  }

  async function crear() {
    setError(null);
    const items: ItemDelivery[] = form.items
      .filter(i => i.nombre.trim())
      .map(i => ({ nombre: i.nombre.trim(), cantidad: parseInt(i.cantidad, 10) || 1, precio: parseInt(i.precio, 10) || 0 }));

    if (!form.cliente.trim() || !form.direccion.trim() || items.length === 0) {
      setError("Faltan cliente, dirección o productos");
      return;
    }

    setGuardando(true);
    const res = await fetch("/api/delivery", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, despacho: parseInt(form.despacho, 10) || 0, items }),
    });
    setGuardando(false);

    if (res.ok) {
      const creado: PedidoDelivery = await res.json();
      setPedidos(prev => [creado, ...prev]);
      setForm(BORRADOR_VACIO);
      setAbierto(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo crear el pedido");
    }
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const delDia = pedidos.filter(p => new Date(p.created_at) >= hoy);
  const visibles = pedidos.filter(p => p.estado !== "entregado" || new Date(p.created_at) >= hoy);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Pedidos delivery</div>
            <div style={{ fontSize: 17, color: TEXT3 }}>
              {delDia.length} pedidos hoy · {fmt(delDia.reduce((s, p) => s + p.total, 0))}
            </div>
          </div>
          <button onClick={() => setAbierto(v => !v)} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontFamily: FONT, fontSize: 17 }}>
            {abierto ? "Cerrar" : "+ Nuevo pedido"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {error}
          </div>
        )}

        {abierto && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input placeholder="Cliente" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 180 }} />
              <input placeholder="+56 9 ..." value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={{ ...inputBase, width: 170 }} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input placeholder="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} style={{ ...inputBase, flex: 2, minWidth: 220 }} />
              <input placeholder="Depto / referencia" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 160 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 15, color: TEXT2, fontWeight: 700 }}>Productos</div>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Producto" value={item.nombre}
                    onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x) }))}
                    style={{ ...inputBase, flex: 2, minWidth: 160 }} />
                  <input type="number" placeholder="Cant." value={item.cantidad}
                    onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x) }))}
                    style={{ ...inputBase, width: 85 }} />
                  <input type="number" placeholder="Precio c/u" value={item.precio}
                    onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, precio: e.target.value } : x) }))}
                    style={{ ...inputBase, width: 130 }} />
                  {form.items.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                      style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 19 }}>🗑</button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, items: [...f.items, { nombre: "", cantidad: "1", precio: "" }] }))}
                style={{ alignSelf: "flex-start", background: "none", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: FONT, fontSize: 15 }}>
                + Agregar producto
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" placeholder="Despacho" value={form.despacho} onChange={e => setForm(f => ({ ...f, despacho: e.target.value }))} style={{ ...inputBase, width: 140 }} />
              <input placeholder="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} style={{ ...inputBase, flex: 1, minWidth: 180 }} />
              <button onClick={crear} disabled={guardando} style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                {guardando ? "..." : "Crear pedido"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
            {COLUMNAS.map(col => {
              const cards = visibles.filter(p => p.estado === col.value);
              return (
                <div key={col.value}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 99, background: col.color }} />
                    <span style={{ fontSize: 17, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</span>
                    <span style={{ fontSize: 16, color: TEXT3, marginLeft: "auto" }}>{cards.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cards.map(p => (
                      <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${col.color}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 18 }}>{p.cliente}</span>
                          <span style={{ fontSize: 15, color: TEXT3 }}>
                            {new Date(p.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div style={{ fontSize: 16, color: TEXT2, marginBottom: 2 }}>{p.direccion}</div>
                        {p.referencia && <div style={{ fontSize: 15, color: TEXT3, marginBottom: 6 }}>{p.referencia}</div>}

                        <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "8px 0" }}>
                          {p.items.map((i, k) => (
                            <div key={k} style={{ fontSize: 16, color: TEXT2 }}>{i.cantidad}× {i.nombre}</div>
                          ))}
                        </div>
                        {p.despacho > 0 && <div style={{ fontSize: 15, color: TEXT3 }}>Despacho {fmt(p.despacho)}</div>}
                        {p.notas && <div style={{ fontSize: 15, color: AMR, fontStyle: "italic", margin: "6px 0" }}>“{p.notas}”</div>}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
                          <span style={{ fontWeight: 700, color: AMR, fontSize: 17 }}>{fmt(p.total)}</span>
                          {col.next && (
                            <button onClick={() => cambiarEstado(p.id, col.next!)}
                              style={{ background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1, borderRadius: 8, padding: "6px 12px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                              → {COLUMNAS.find(c => c.value === col.next)!.label}
                            </button>
                          )}
                        </div>

                        {p.telefono && (
                          <a href={`https://wa.me/${p.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: "block", marginTop: 8, textAlign: "center", background: "#1a2e1a", color: VERDE, borderRadius: 8, padding: "6px 0", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <div style={{ background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: "20px 14px", textAlign: "center", color: TEXT3, fontSize: 17 }}>
                        Sin pedidos
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
