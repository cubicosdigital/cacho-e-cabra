"use client";
import { useEffect, useMemo, useState } from "react";
import type { PedidoDelivery } from "../../../../lib/delivery";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, AZUL, FONT, TITLE } from "../../../../lib/tokens";

interface ItemLocal { id: string; nombre: string; categoria: string; cantidad: number; precio_unitario: number; }
interface PedidoLocal {
  id: string; mesa_numero: string; estado: string; total: number;
  created_at: string; items_pedido: ItemLocal[];
}

type Rango = "hoy" | "semana" | "mes";

const RANGOS: { value: Rango; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Últimos 7 días" },
  { value: "mes", label: "Últimos 30 días" },
];

function fmt(n: number) { return `$${n.toLocaleString("es-CL")}`; }

function desde(rango: Rango): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (rango === "semana") d.setDate(d.getDate() - 6);
  if (rango === "mes") d.setDate(d.getDate() - 29);
  return d;
}

export default function VentasPage() {
  const [locales, setLocales] = useState<PedidoLocal[]>([]);
  const [delivery, setDelivery] = useState<PedidoDelivery[]>([]);
  const [rango, setRango] = useState<Rango>("hoy");
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [rLocal, rDelivery] = await Promise.all([
        fetch("/api/pedidos"),
        fetch("/api/delivery"),
      ]);
      if (rLocal.ok) setLocales(await rLocal.json());
      else setAviso("No se pudieron cargar los pedidos del local");
      if (rDelivery.ok) setDelivery(await rDelivery.json());
      setLoading(false);
    })();
  }, []);

  const datos = useMemo(() => {
    const corte = desde(rango);

    // Solo cuentan las ventas cerradas: un pedido en curso todavía puede caerse.
    const loc = locales.filter(p => p.estado === "entregado" && new Date(p.created_at) >= corte);
    const del = delivery.filter(p => p.estado === "entregado" && new Date(p.created_at) >= corte);

    const totalLocal = loc.reduce((s, p) => s + p.total, 0);
    const totalDelivery = del.reduce((s, p) => s + p.total, 0);
    const pedidos = loc.length + del.length;

    const porCategoria = new Map<string, { unidades: number; monto: number }>();
    for (const p of loc) {
      for (const i of p.items_pedido) {
        const prev = porCategoria.get(i.categoria) ?? { unidades: 0, monto: 0 };
        porCategoria.set(i.categoria, {
          unidades: prev.unidades + i.cantidad,
          monto: prev.monto + i.cantidad * i.precio_unitario,
        });
      }
    }

    const porProducto = new Map<string, number>();
    for (const p of loc) for (const i of p.items_pedido) {
      porProducto.set(i.nombre, (porProducto.get(i.nombre) ?? 0) + i.cantidad);
    }
    for (const p of del) for (const i of p.items) {
      porProducto.set(i.nombre, (porProducto.get(i.nombre) ?? 0) + i.cantidad);
    }

    return {
      totalLocal, totalDelivery, total: totalLocal + totalDelivery, pedidos,
      ticket: pedidos > 0 ? Math.round((totalLocal + totalDelivery) / pedidos) : 0,
      categorias: [...porCategoria.entries()].sort((a, b) => b[1].monto - a[1].monto),
      productos: [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }, [locales, delivery, rango]);

  const maxMonto = datos.categorias[0]?.[1].monto ?? 1;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Resumen de ventas</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Solo cuenta lo entregado. Local + delivery.</div>
        </div>

        {aviso && (
          <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>
            {aviso}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, alignSelf: "flex-start" }}>
          {RANGOS.map(r => (
            <button key={r.value} onClick={() => setRango(r.value)} style={{
              fontFamily: FONT, fontSize: 17, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: rango === r.value ? AMR : "transparent", color: rango === r.value ? "#1a1200" : TEXT3,
            }}>{r.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: TEXT3 }}>Cargando…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
              {[
                { label: "Total vendido", valor: fmt(datos.total), color: AMR },
                { label: "Local", valor: fmt(datos.totalLocal), color: VERDE },
                { label: "Delivery", valor: fmt(datos.totalDelivery), color: AZUL },
                { label: "Pedidos", valor: String(datos.pedidos), color: TEXT1 },
                { label: "Ticket promedio", valor: fmt(datos.ticket), color: TEXT1 },
              ].map(c => (
                <div key={c.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ fontSize: 14, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: c.color, fontFamily: TITLE, marginTop: 4 }}>{c.valor}</div>
                </div>
              ))}
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Ventas por categoría</div>
              {datos.categorias.length === 0 ? (
                <div style={{ color: TEXT3, fontSize: 16 }}>Sin ventas en este período</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {datos.categorias.map(([cat, d]) => (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, marginBottom: 4 }}>
                        <span style={{ color: TEXT1, fontWeight: 600, textTransform: "capitalize" }}>{cat}</span>
                        <span style={{ color: TEXT3 }}>{d.unidades} u · <strong style={{ color: AMR }}>{fmt(d.monto)}</strong></span>
                      </div>
                      <div style={{ height: 6, background: SURF2, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${(d.monto / maxMonto) * 100}%`, height: "100%", background: AMR }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 14 }}>Los 10 más vendidos</div>
              {datos.productos.length === 0 ? (
                <div style={{ color: TEXT3, fontSize: 16 }}>Sin ventas en este período</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {datos.productos.map(([nombre, unidades], i) => (
                    <div key={nombre} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 17 }}>
                      <span style={{ color: TEXT3, width: 24, fontWeight: 700 }}>{i + 1}</span>
                      <span style={{ flex: 1, color: TEXT1 }}>{nombre}</span>
                      <span style={{ color: AMR, fontWeight: 800 }}>{unidades}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
