"use client";
import { useState } from "react";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";
import type { Barra } from "../../../../lib/asistencia";

export const tarjeta: React.CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 };

export function Kpi({ etiqueta, valor, nota, color = TEXT1 }: { etiqueta: string; valor: string; nota?: React.ReactNode; color?: string }) {
  return (
    <div style={{ ...tarjeta, flex: "1 1 200px", minWidth: 200, padding: "18px 20px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{etiqueta}</div>
      <div style={{ fontFamily: TITLE, fontSize: 34, fontWeight: 900, color, lineHeight: 1.15, marginTop: 6 }}>{valor}</div>
      {nota && <div style={{ fontSize: 14, color: TEXT3, marginTop: 4 }}>{nota}</div>}
    </div>
  );
}

export function Panel({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div style={tarjeta}>
      <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: 15, color: TEXT3, marginBottom: 14 }}>{subtitulo}</div>}
      {!subtitulo && <div style={{ height: 14 }} />}
      {children}
    </div>
  );
}

/** Barras verticales con tooltip al pasar el mouse. `formato` da el texto del valor. */
export function BarrasVerticales({ barras, formato, color = AMR, alto = 170 }: {
  barras: Barra[]; formato: (v: number) => string; color?: string; alto?: number;
}) {
  const [activa, setActiva] = useState<number | null>(null);
  if (barras.length === 0) return <div style={{ color: TEXT3, fontSize: 16 }}>Sin datos en este rango.</div>;
  const max = Math.max(...barras.map(b => b.valor), 1);
  const cadaN = Math.ceil(barras.length / 12);

  return (
    <div>
      <div style={{ height: 22, fontSize: 15, color: TEXT2, fontWeight: 700 }}>
        {activa != null && `${barras[activa].detalle ?? barras[activa].etiqueta}: ${formato(barras[activa].valor)}`}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: barras.length > 40 ? 2 : 4, height: alto, borderBottom: `1px solid ${BORDER}` }}>
        {barras.map((b, i) => (
          <div key={i} onMouseEnter={() => setActiva(i)} onMouseLeave={() => setActiva(null)}
            style={{ flex: 1, minWidth: 2, height: "100%", display: "flex", alignItems: "flex-end", cursor: "default" }}>
            <div style={{
              width: "100%", height: `${Math.max(2, (b.valor / max) * 100)}%`, background: color,
              opacity: activa == null || activa === i ? 1 : 0.45, borderRadius: "4px 4px 0 0", transition: "opacity .12s",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: barras.length > 40 ? 2 : 4, marginTop: 6 }}>
        {barras.map((b, i) => (
          <div key={i} style={{ flex: 1, minWidth: 2, fontSize: 12, color: TEXT3, textAlign: "center", overflow: "visible", whiteSpace: "nowrap" }}>
            {i % cadaN === 0 ? b.etiqueta : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranking con barras horizontales. */
export function BarrasHorizontales({ filas, formato, color = AMR, href }: {
  filas: { id: string; etiqueta: string; valor: number; color?: string; nota?: string }[];
  formato: (v: number) => string; color?: string; href?: (id: string) => string;
}) {
  if (filas.length === 0) return <div style={{ color: TEXT3, fontSize: 16 }}>Sin datos en este rango.</div>;
  const max = Math.max(...filas.map(f => f.valor), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {filas.map((f, i) => {
        const contenido = (
          <>
            <div style={{ width: 26, fontFamily: TITLE, fontWeight: 900, fontSize: 18, color: i === 0 ? AMR : TEXT3 }}>{i + 1}</div>
            <div style={{ width: 230, fontSize: 16, fontWeight: 600, color: TEXT1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.etiqueta}</div>
            <div style={{ flex: 1, background: SURF2, borderRadius: 999, height: 14, overflow: "hidden" }}>
              <div style={{ width: `${(f.valor / max) * 100}%`, height: "100%", background: f.color ?? color, borderRadius: 999 }} />
            </div>
            <div style={{ width: 130, textAlign: "right", fontSize: 16, fontWeight: 700, color: TEXT2 }}>{formato(f.valor)}</div>
          </>
        );
        const estilo: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, textDecoration: "none" };
        return href
          ? <a key={f.id} href={href(f.id)} style={estilo}>{contenido}</a>
          : <div key={f.id} style={estilo}>{contenido}</div>;
      })}
    </div>
  );
}

/** Rango de fechas con botón "Aplicar filtro" al lado de los calendarios. */
export function FiltroFechas({ desde, hasta, onAplicar }: { desde: string; hasta: string; onAplicar: (d: string, h: string) => void }) {
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(2);
          opacity: 1;
          width: 28px;
          height: 28px;
          cursor: pointer;
        }
      `}</style>
      <label style={{ fontSize: 15, color: TEXT3 }}>Desde</label>
      <input type="date" value={d} onChange={e => setD(e.target.value)} style={inp} />
      <label style={{ fontSize: 15, color: TEXT3 }}>Hasta</label>
      <input type="date" value={h} onChange={e => setH(e.target.value)} style={inp} />
      <button onClick={() => { if (d && h) onAplicar(d, h); }}
        style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
        Aplicar filtro
      </button>
    </div>
  );
}

export const botonVolver: React.CSSProperties = {
  display: "inline-block", background: SURF2, color: TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "6px 16px", fontSize: 16, fontWeight: 700, textDecoration: "none", marginBottom: 16, fontFamily: FONT,
};
