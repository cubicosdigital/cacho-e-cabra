"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, ROJO, VERDE, FONT, TITLE } from "../../../../lib/tokens";

type Estado = "recibido" | "preparando" | "listo" | "entregado";
type Rol = "admin" | "mesero" | "cocina" | "barra" | "caja";

interface Item { id: string; nombre: string; categoria: string; cantidad: number; precio_unitario: number; }
interface Pedido {
  id: string; mesa_numero: string; nombre_cliente: string; notas: string;
  estado: Estado; total: number; created_at: string; items_pedido: Item[];
}

const ESTADOS: { value: Estado; label: string; color: string; next?: Estado }[] = [
  { value: "recibido",   label: "Recibido",   color: ROJO,  next: "preparando" },
  { value: "preparando", label: "Preparando", color: AMR,   next: "listo" },
  { value: "listo",      label: "Listo",      color: VERDE, next: "entregado" },
  { value: "entregado",  label: "Entregado",  color: TEXT3 },
];

const CATEGORIAS_POR_ROL: Record<Rol, string[] | null> = {
  admin: null, mesero: null, caja: null,
  cocina: ["chef", "comida", "brunch", "postres"],
  barra: ["cafeteria", "tragos"],
};

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [rol, setRol] = useState<Rol>("admin");
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/pedidos");
    if (!res.ok) return;
    const data: Pedido[] = await res.json();
    const ahora = Date.now();
    setPedidos(data.filter(p => p.estado !== "entregado" || ahora - new Date(p.created_at).getTime() < 30 * 60 * 1000));
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/me");
      if (meRes.ok) { const me = await meRes.json(); if (me?.rol) setRol(me.rol); }
      await cargar();
      setLoading(false);
    })();

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel("pedidos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "items_pedido" }, cargar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cargar]);

  async function cambiarEstado(id: string, estado: Estado) {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    await fetch(`/api/pedidos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  }

  const catFiltro = CATEGORIAS_POR_ROL[rol];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Pedidos en vivo</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>
            {catFiltro ? `Vista ${rol} · ${catFiltro.join(", ")}` : "Vista completa"}
          </div>
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
            {ESTADOS.map(col => {
              const cards = pedidos.filter(p => p.estado === col.value);
              return (
                <div key={col.value}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 99, background: col.color }} />
                    <span style={{ fontSize: 17, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</span>
                    <span style={{ fontSize: 16, color: TEXT3, marginLeft: "auto" }}>{cards.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cards.map(p => {
                      const items = catFiltro ? p.items_pedido.filter(i => catFiltro.includes(i.categoria)) : p.items_pedido;
                      if (catFiltro && items.length === 0) return null;
                      return (
                        <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${col.color}`, borderRadius: 12, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 19 }}>Mesa {p.mesa_numero}</span>
                            <span style={{ fontSize: 16, color: TEXT3 }}>{new Date(p.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          {p.nombre_cliente && <div style={{ fontSize: 16, color: TEXT3, marginBottom: 6 }}>{p.nombre_cliente}</div>}
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                            {items.map(i => (
                              <div key={i.id} style={{ fontSize: 17, color: TEXT2, display: "flex", justifyContent: "space-between" }}>
                                <span>{i.cantidad}× {i.nombre}</span>
                              </div>
                            ))}
                          </div>
                          {p.notas && <div style={{ fontSize: 16, color: AMR, marginBottom: 8, fontStyle: "italic" }}>“{p.notas}”</div>}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, color: AMR, fontSize: 17 }}>{fmt(p.total)}</span>
                            {col.next && (
                              <button onClick={() => cambiarEstado(p.id, col.next!)}
                                style={{ background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1, borderRadius: 8, padding: "6px 12px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                                → {ESTADOS.find(e => e.value === col.next)!.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
