"use client";
import { useCallback, useEffect, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, AZUL, FONT, TITLE } from "../../../../lib/tokens";
import { METODOS, METODO_LABEL, MINUTOS_ALERTA, type Detalle, type Metodo, type Resumen } from "../../../../lib/pos";

interface Panel {
  abiertas: Resumen[]; conDeuda: Resumen[]; porAbrir: { mesa: string; pedidos: number; total: number; desde: string }[];
  cobradoHoy: number; propinasHoy: number;
}
type Modo = "items" | "partes" | "libre";

const plata = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const tiempo = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`);
const tarjeta: React.CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 };
const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16, width: "100%", boxSizing: "border-box" };
const chip = (activo: boolean): React.CSSProperties => ({
  background: activo ? AMR : SURF2, color: activo ? "#1a1200" : TEXT2, border: `1px solid ${activo ? AMR : BORDER}`,
  borderRadius: 8, padding: "8px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
});

export default function PosPage() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [sel, setSel] = useState<Detalle | null>(null);
  const [error, setError] = useState("");
  const [nuevaMesa, setNuevaMesa] = useState("");
  const [modo, setModo] = useState<Modo>("items");
  const [unidades, setUnidades] = useState<Record<string, number>>({});
  const [partes, setPartes] = useState(2);
  const [libre, setLibre] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("efectivo");
  const [pagador, setPagador] = useState("");
  const [propina, setPropina] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const cargarPanel = useCallback(async () => {
    const res = await fetch("/api/pos/cuentas");
    if (res.ok) { setPanel(await res.json()); setError(""); }
    else setError((await res.json().catch(() => ({}))).error ?? "No se pudo cargar el POS");
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    const res = await fetch(`/api/pos/cuentas/${id}`);
    if (res.ok) setSel(await res.json());
  }, []);

  useEffect(() => {
    (async () => { await cargarPanel(); })();
    const t = setInterval(() => { cargarPanel(); }, 8000);
    return () => clearInterval(t);
  }, [cargarPanel]);

  const selId = sel?.id;
  useEffect(() => {
    if (!selId) return;
    const t = setInterval(() => { cargarDetalle(selId); }, 8000);
    return () => clearInterval(t);
  }, [selId, cargarDetalle]);

  function elegir(d: Detalle | Resumen) {
    setUnidades({}); setLibre(""); setPagador(""); setPropina(""); setMetodo("efectivo"); setModo("items"); setPartes(2); setError("");
    cargarDetalle(d.id);
  }

  async function abrir(mesa: string) {
    setError("");
    const res = await fetch("/api/pos/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mesa }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); return; }
    setNuevaMesa(""); setSel(d); elegir(d); await cargarPanel();
  }

  const saldo = sel?.saldo ?? 0;
  const montoItems = sel ? sel.items.reduce((s, i) => s + (unidades[i.id] ?? 0) * i.precio_unitario, 0) : 0;
  const montoPartes = partes > 0 ? Math.ceil(saldo / partes) : 0;
  const monto = modo === "items" ? montoItems : modo === "partes" ? montoPartes : parseInt(libre, 10) || 0;
  const puedeCobrar = !!sel && sel.estado === "abierta" && monto > 0 && monto <= saldo && (metodo !== "cortesia" || pagador.trim().length > 0) && !trabajando;

  async function cobrar() {
    if (!sel || !puedeCobrar) return;
    setTrabajando(true); setError("");
    const items = modo === "items" ? Object.entries(unidades).filter(([, n]) => n > 0).map(([item_id, cantidad]) => ({ item_id, cantidad })) : [];
    const res = await fetch(`/api/pos/cuentas/${sel.id}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monto, metodo, pagador, propina: parseInt(propina, 10) || 0, items }) });
    const d = await res.json();
    setTrabajando(false);
    if (!res.ok) { setError(d.error); return; }
    setSel(d); setUnidades({}); setLibre(""); setPagador(""); setPropina("");
    if (modo === "partes") setPartes(p => Math.max(1, p - 1));
    await cargarPanel();
  }

  async function accion(cuerpo: Record<string, unknown>) {
    if (!sel) return;
    setError("");
    const res = await fetch(`/api/pos/cuentas/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); return; }
    setSel(d); await cargarPanel();
  }

  function cerrarConDeuda() {
    const motivo = prompt(`Faltan ${plata(saldo)} por pagar. ¿Por qué se cierra la cuenta así? (obligatorio)`);
    if (motivo?.trim()) accion({ accion: "cerrar", motivo });
  }

  async function anular(pagoId: string) {
    const motivo = prompt("Motivo de la anulación de este pago (obligatorio):");
    if (!motivo?.trim()) return;
    const res = await fetch(`/api/pos/pagos/${pagoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error); return; }
    setSel(d); await cargarPanel();
  }

  if (!panel) return <div style={{ minHeight: "100vh", background: BG, color: error ? ROJO : TEXT3, fontFamily: FONT, padding: 40 }}>{error || "Cargando…"}</div>;

  const porCobrar = panel.abiertas.reduce((s, c) => s + c.saldo, 0);
  const atrasadas = panel.abiertas.filter(c => c.saldo > 0 && c.minutos >= MINUTOS_ALERTA);
  const deudaTotal = panel.conDeuda.reduce((s, c) => s + c.saldo, 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "28px 36px 48px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>POS · Caja</div>
          <div style={{ fontSize: 17, color: TEXT3 }}>Cobra cada cuenta por partes: cada persona paga lo suyo y el saldo baja hasta cero.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { t: "Cobrado hoy", v: plata(panel.cobradoHoy), c: VERDE, n: panel.propinasHoy ? `+ ${plata(panel.propinasHoy)} de propina` : "sin propinas registradas" },
            { t: "Por cobrar ahora", v: plata(porCobrar), c: porCobrar ? AMR : TEXT1, n: `${panel.abiertas.length} cuenta${panel.abiertas.length === 1 ? "" : "s"} abierta${panel.abiertas.length === 1 ? "" : "s"}` },
            { t: "Mesas sin abrir cuenta", v: String(panel.porAbrir.length), c: panel.porAbrir.length ? AZUL : TEXT1, n: "con pedidos por cobrar" },
            { t: "Cerradas con deuda", v: plata(deudaTotal), c: deudaTotal ? ROJO : TEXT1, n: `${panel.conDeuda.length} cuenta${panel.conDeuda.length === 1 ? "" : "s"} (30 días)` },
          ].map(k => (
            <div key={k.t} style={{ ...tarjeta, padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.t}</div>
              <div style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 14, color: TEXT3 }}>{k.n}</div>
            </div>
          ))}
        </div>

        {(atrasadas.length > 0 || panel.conDeuda.length > 0) && (
          <div style={{ ...tarjeta, borderColor: ROJO, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, color: ROJO }}>Falta cobrar</div>
            {atrasadas.map(c => (
              <button key={c.id} onClick={() => elegir(c)} style={{ textAlign: "left", background: SURF2, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${AMR}`, borderRadius: 10, padding: "9px 14px", color: TEXT1, cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>
                Mesa <strong>{c.mesa}</strong> lleva {tiempo(c.minutos)} abierta y faltan <strong style={{ color: AMR }}>{plata(c.saldo)}</strong> por pagar →
              </button>
            ))}
            {panel.conDeuda.map(c => (
              <button key={c.id} onClick={() => elegir(c)} style={{ textAlign: "left", background: SURF2, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ROJO}`, borderRadius: 10, padding: "9px 14px", color: TEXT1, cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>
                Mesa <strong>{c.mesa}</strong> se cerró con <strong style={{ color: ROJO }}>{plata(c.saldo)}</strong> sin pagar{c.nota_cierre ? ` · «${c.nota_cierre}»` : ""} →
              </button>
            ))}
          </div>
        )}

        {error && <div style={{ background: "#2a1212", border: "1px solid #5c2626", color: "#fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 16 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
          {/* Lista de cuentas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={tarjeta}>
              <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Abrir cuenta</div>
              {panel.porAbrir.length === 0 && <div style={{ color: TEXT3, fontSize: 15, marginBottom: 10 }}>No hay mesas con pedidos por cobrar.</div>}
              {panel.porAbrir.map(m => (
                <button key={m.mesa} onClick={() => abrir(m.mesa)} style={{ display: "flex", justifyContent: "space-between", width: "100%", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, color: TEXT1, cursor: "pointer", fontFamily: FONT, fontSize: 16 }}>
                  <span>Mesa <strong>{m.mesa}</strong> · {m.pedidos} pedido{m.pedidos > 1 ? "s" : ""}</span><strong style={{ color: AMR }}>{plata(m.total)}</strong>
                </button>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <input value={nuevaMesa} onChange={e => setNuevaMesa(e.target.value)} placeholder="Mesa (ej. 5)" style={inp} onKeyDown={e => e.key === "Enter" && nuevaMesa.trim() && abrir(nuevaMesa)} />
                <button onClick={() => nuevaMesa.trim() && abrir(nuevaMesa)} style={{ ...chip(true), flexShrink: 0 }}>Abrir</button>
              </div>
            </div>

            <div style={tarjeta}>
              <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Cuentas abiertas</div>
              {panel.abiertas.length === 0 && <div style={{ color: TEXT3, fontSize: 15 }}>No hay cuentas abiertas.</div>}
              {panel.abiertas.map(c => {
                const tarde = c.saldo > 0 && c.minutos >= MINUTOS_ALERTA;
                return (
                  <button key={c.id} onClick={() => elegir(c)} style={{ display: "block", width: "100%", textAlign: "left", background: sel?.id === c.id ? "#3a2f10" : SURF2, border: `1px solid ${sel?.id === c.id ? AMR : tarde ? ROJO : BORDER}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, color: TEXT1, cursor: "pointer", fontFamily: FONT }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17 }}><strong>Mesa {c.mesa}</strong><strong style={{ color: AMR }}>{plata(c.saldo)}</strong></div>
                    <div style={{ fontSize: 14, color: tarde ? ROJO : TEXT3 }}>{tiempo(c.minutos)} abierta · pagado {plata(c.pagado)} de {plata(c.total)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle */}
          <div>
            {!sel ? (
              <div style={{ ...tarjeta, color: TEXT3, textAlign: "center", padding: 48 }}>Elige una cuenta, o abre la de una mesa, para cobrar.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ ...tarjeta, borderColor: sel.estado === "pagada" ? VERDE : sel.estado === "con_deuda" ? ROJO : BORDER }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900 }}>Mesa {sel.mesa}</div>
                    <span style={{ fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "3px 12px", border: `1px solid ${sel.estado === "pagada" ? VERDE : sel.estado === "con_deuda" ? ROJO : AMR}`, color: sel.estado === "pagada" ? VERDE : sel.estado === "con_deuda" ? ROJO : AMR }}>
                      {sel.estado === "pagada" ? "Pagada" : sel.estado === "con_deuda" ? "Cerrada con deuda" : `Abierta hace ${tiempo(sel.minutos)}`}
                    </span>
                    <div style={{ flex: 1 }} />
                    {sel.estado === "abierta" && saldo > 0 && <button onClick={cerrarConDeuda} style={{ ...chip(false), color: ROJO }}>Cerrar con saldo pendiente</button>}
                    {sel.estado !== "abierta" && <button onClick={() => accion({ accion: "reabrir" })} style={chip(false)}>Reabrir cuenta</button>}
                  </div>
                  <div style={{ display: "flex", gap: 32, marginTop: 14, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 13, color: TEXT3, fontWeight: 800 }}>TOTAL</div><div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900 }}>{plata(sel.total)}</div></div>
                    <div><div style={{ fontSize: 13, color: TEXT3, fontWeight: 800 }}>PAGADO</div><div style={{ fontFamily: TITLE, fontSize: 26, fontWeight: 900, color: VERDE }}>{plata(sel.pagado)}</div></div>
                    <div><div style={{ fontSize: 13, color: TEXT3, fontWeight: 800 }}>FALTA PAGAR</div><div style={{ fontFamily: TITLE, fontSize: 34, fontWeight: 900, color: saldo > 0 ? AMR : VERDE }}>{plata(saldo)}</div></div>
                  </div>
                  {sel.nota_cierre && <div style={{ marginTop: 10, color: TEXT2, fontSize: 15 }}>Motivo del cierre: {sel.nota_cierre}</div>}
                </div>

                <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px 6px", fontFamily: TITLE, fontSize: 18, fontWeight: 900 }}>Consumo</div>
                  {sel.items.length === 0 && <div style={{ padding: "0 18px 16px", color: TEXT3 }}>Esta cuenta aún no tiene productos.</div>}
                  {sel.items.map(i => {
                    const resta = i.cantidad - i.pagado, n = unidades[i.id] ?? 0;
                    return (
                      <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: `1px solid ${BORDER}`, opacity: resta === 0 ? 0.55 : 1, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontWeight: 700, fontSize: 17 }}>{i.cantidad} × {i.nombre}</div>
                          <div style={{ fontSize: 14, color: resta === 0 ? VERDE : TEXT3 }}>{resta === 0 ? "Pagado completo" : i.pagado > 0 ? `Pagado ${i.pagado} de ${i.cantidad}` : `${plata(i.precio_unitario)} c/u`}</div>
                        </div>
                        <div style={{ fontWeight: 700, width: 90, textAlign: "right" }}>{plata(i.cantidad * i.precio_unitario)}</div>
                        {sel.estado === "abierta" && modo === "items" && resta > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => setUnidades(u => ({ ...u, [i.id]: Math.max(0, n - 1) }))} style={{ ...chip(false), padding: "4px 12px" }}>−</button>
                            <span style={{ width: 26, textAlign: "center", fontWeight: 800, color: n ? AMR : TEXT3 }}>{n}</span>
                            <button onClick={() => setUnidades(u => ({ ...u, [i.id]: Math.min(resta, n + 1) }))} style={{ ...chip(false), padding: "4px 12px" }}>+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {sel.estado === "abierta" && (
                  <div style={tarjeta}>
                    <div style={{ fontFamily: TITLE, fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Cobrar</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <button onClick={() => setModo("items")} style={chip(modo === "items")}>Por ítems</button>
                      <button onClick={() => setModo("partes")} style={chip(modo === "partes")}>Dividir en partes iguales</button>
                      <button onClick={() => setModo("libre")} style={chip(modo === "libre")}>Monto libre</button>
                    </div>

                    {modo === "items" && <div style={{ fontSize: 15, color: TEXT2, marginBottom: 10 }}>Marca arriba con + los productos que paga esta persona.</div>}
                    {modo === "partes" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ color: TEXT2, fontSize: 15 }}>Personas que faltan por pagar:</span>
                        <button onClick={() => setPartes(p => Math.max(1, p - 1))} style={{ ...chip(false), padding: "4px 12px" }}>−</button>
                        <strong style={{ fontSize: 20, width: 28, textAlign: "center" }}>{partes}</strong>
                        <button onClick={() => setPartes(p => p + 1)} style={{ ...chip(false), padding: "4px 12px" }}>+</button>
                        <span style={{ color: TEXT3, fontSize: 14 }}>Cada una paga {plata(montoPartes)}. Al quedar 1, paga lo que falta.</span>
                      </div>
                    )}
                    {modo === "libre" && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <input type="number" value={libre} onChange={e => setLibre(e.target.value)} placeholder="Monto a cobrar" style={{ ...inp, maxWidth: 220 }} />
                        <button onClick={() => setLibre(String(saldo))} style={chip(false)}>Todo lo que falta</button>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {METODOS.map(m => <button key={m} onClick={() => setMetodo(m)} style={chip(metodo === m)}>{METODO_LABEL[m]}</button>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
                      <input value={pagador} onChange={e => setPagador(e.target.value)} placeholder={metodo === "cortesia" ? "Motivo (obligatorio)" : "¿Quién paga? (opcional)"} style={inp} />
                      <input type="number" value={propina} onChange={e => setPropina(e.target.value)} placeholder="Propina (opcional)" style={inp} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <button onClick={cobrar} disabled={!puedeCobrar} style={{ background: VERDE, color: "#062018", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 18, fontWeight: 800, cursor: puedeCobrar ? "pointer" : "not-allowed", opacity: puedeCobrar ? 1 : 0.5, fontFamily: FONT }}>
                        {trabajando ? "Registrando…" : `Registrar pago de ${plata(monto)}`}
                      </button>
                      {monto > saldo && <span style={{ color: ROJO, fontSize: 15 }}>El monto supera lo que falta ({plata(saldo)}).</span>}
                      {monto > 0 && monto <= saldo && <span style={{ color: TEXT3, fontSize: 15 }}>Quedará un saldo de {plata(saldo - monto)}.</span>}
                    </div>
                  </div>
                )}

                {sel.pagos.length > 0 && (
                  <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px 6px", fontFamily: TITLE, fontSize: 18, fontWeight: 900 }}>Pagos registrados</div>
                    {sel.pagos.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: `1px solid ${BORDER}`, opacity: p.anulado ? 0.5 : 1, flexWrap: "wrap" }}>
                        <div style={{ width: 54, color: TEXT3, fontSize: 14 }}>{new Date(p.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, textDecoration: p.anulado ? "line-through" : "none" }}>{p.pagador || "Sin nombre"} · {METODO_LABEL[p.metodo]}</div>
                          {p.anulado && <div style={{ fontSize: 13, color: ROJO }}>Anulado: {p.anulado_motivo}</div>}
                          {!p.anulado && p.propina > 0 && <div style={{ fontSize: 13, color: TEXT3 }}>+ {plata(p.propina)} de propina</div>}
                        </div>
                        <div style={{ fontWeight: 800, color: p.anulado ? TEXT3 : VERDE }}>{plata(p.monto)}</div>
                        {!p.anulado && <button onClick={() => anular(p.id)} style={{ background: "none", border: "none", color: ROJO, cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>anular</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
