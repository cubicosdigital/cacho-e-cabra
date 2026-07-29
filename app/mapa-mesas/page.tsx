"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

// ─── tipos ────────────────────────────────────────────────────────────────────
type Herramienta = "seleccionar" | "zona-rect" | "zona-poly" | "mesa-cuad" | "mesa-redonda" | "mesa-barra" | "eliminar";

interface ZonaRect {
  id: string; tipo: "zona"; forma: "rect";
  x: number; y: number; w: number; h: number;
  label: string; color: string;
}
interface ZonaPoly {
  id: string; tipo: "zona"; forma: "poly";
  points: [number, number][]; closed: boolean;
  label: string; color: string;
}
interface Mesa {
  id: string; tipo: "mesa";
  forma: "cuad" | "redonda" | "barra";
  x: number; y: number; w: number; h: number;
  label: string; capacidad: number; numero: number;
}
type Elemento = ZonaRect | ZonaPoly | Mesa;

// ─── tokens ───────────────────────────────────────────────────────────────────
const BG      = "#2d2b27";
const SURFACE = "#383430";
const SURF2   = "#433f3a";
const BORDER  = "#504b46";
const TEXT1   = "#f5f2ee";
const TEXT2   = "#d8d2cc";
const TEXT3   = "#b0a89f";
const AMR     = "#FBBF24";
const FONT    = "var(--font-dm), sans-serif";
const TITLE   = "var(--font-raleway), sans-serif";

// ─── canvas config ─────────────────────────────────────────────────────────────
const CW = 1200;   // canvas width
const CH = 800;    // canvas height
const GRID = 20;   // grid snap

// ─── zona presets ─────────────────────────────────────────────────────────────
const ZONA_PRESETS = [
  { label: "Salón",     color: "#FBBF24" },
  { label: "Terraza",   color: "#34d399" },
  { label: "Barra",     color: "#60a5fa" },
  { label: "Escenario", color: "#a78bfa" },
  { label: "Cocina",    color: "#f05252" },
  { label: "VIP",       color: "#f472b6" },
];

const MESA_DEFAULTS = {
  cuad:    { w: 60,  h: 60,  capacidad: 4,  label: "Mesa"   },
  redonda: { w: 60,  h: 60,  capacidad: 4,  label: "Mesa"   },
  barra:   { w: 160, h: 40,  capacidad: 6,  label: "Barra"  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function snap(v: number) { return Math.round(v / GRID) * GRID; }
function uid() { return Math.random().toString(36).slice(2, 9); }

function getSvgCoords(e: React.MouseEvent | MouseEvent, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  return {
    x: snap(((e as React.MouseEvent).clientX * CW) / rect.width + (CW - CW * (rect.width / rect.width)) * 0 - (rect.left * CW / rect.width)),
    y: snap(((e as React.MouseEvent).clientY * CH) / rect.height - (rect.top * CH / rect.height)),
  };
}
function getXY(e: React.MouseEvent | MouseEvent, svg: SVGSVGElement): [number, number] {
  const rect = svg.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;
  return [
    snap(((e as React.MouseEvent).clientX - rect.left) * scaleX),
    snap(((e as React.MouseEvent).clientY - rect.top)  * scaleY),
  ];
}

// Distribute N chairs around a rect
function chairPositions(x: number, y: number, w: number, h: number, n: number, forma: string): [number, number][] {
  const cx = x + w / 2, cy = y + h / 2;
  const GAP = 14;
  if (forma === "redonda") {
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return [cx + (w / 2 + GAP) * Math.cos(angle), cy + (h / 2 + GAP) * Math.sin(angle)];
    });
  }
  // For rect/barra: distribute along perimeter
  const perim = 2 * (w + h);
  const step = perim / n;
  return Array.from({ length: n }, (_, i) => {
    let d = i * step;
    if (d < w) return [x + d, y - GAP];
    d -= w;
    if (d < h) return [x + w + GAP, y + d];
    d -= h;
    if (d < w) return [x + w - d, y + h + GAP];
    d -= w;
    return [x - GAP, y + h - d];
  });
}

function polyPath(pts: [number, number][], closed: boolean) {
  if (pts.length < 2) return "";
  return pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + (closed ? " Z" : "");
}

function polyCentroid(pts: [number, number][]): [number, number] {
  if (!pts.length) return [0, 0];
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [x, y];
}

// ─── component ────────────────────────────────────────────────────────────────
export default function MapaMesasPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [elementos, setElementos]     = useState<Elemento[]>(DEMO_ELEMENTOS);
  const [tool, setTool]               = useState<Herramienta>("seleccionar");
  const [selected, setSelected]       = useState<string | null>(null);
  const [editLabel, setEditLabel]     = useState<{ id: string; val: string } | null>(null);
  const [zonaColor, setZonaColor]     = useState(ZONA_PRESETS[0].color);
  const [zonaLabel, setZonaLabel]     = useState(ZONA_PRESETS[0].label);
  const [mesaNum, setMesaNum]         = useState(1);

  // drawing states
  const [rectStart, setRectStart]   = useState<[number, number] | null>(null);
  const [rectCur,   setRectCur]     = useState<[number, number] | null>(null);
  const [polyPts,   setPolyPts]     = useState<[number, number][]>([]);
  const [polyCur,   setPolyCur]     = useState<[number, number] | null>(null);

  // drag state
  const dragRef = useRef<{ id: string; ox: number; oy: number; ex: number; ey: number } | null>(null);

  const totalCapacidad = (elementos.filter(e => e.tipo === "mesa") as Mesa[])
    .reduce((s, m) => s + m.capacidad, 0);
  const totalMesas = elementos.filter(e => e.tipo === "mesa").length;

  const selectedEl = selected ? elementos.find(e => e.id === selected) : null;

  // ── coord helper ──
  function xy(e: React.MouseEvent): [number, number] {
    return getXY(e, svgRef.current!);
  }

  // ── SVG mouse handlers ──────────────────────────────────────────────────────
  function onSvgMouseDown(e: React.MouseEvent) {
    if (!svgRef.current) return;
    const [mx, my] = xy(e);

    if (tool === "seleccionar" || tool === "eliminar") return;
    if (tool === "zona-rect") {
      setRectStart([mx, my]);
      setRectCur([mx, my]);
    }
    if (tool === "zona-poly") {
      // handled in onClick
    }
  }

  function onSvgMouseMove(e: React.MouseEvent) {
    if (!svgRef.current) return;
    const [mx, my] = xy(e);

    if (tool === "zona-rect" && rectStart) {
      setRectCur([mx, my]);
    }
    if (tool === "zona-poly") {
      setPolyCur([mx, my]);
    }
    // drag
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = mx - d.ox, dy = my - d.oy;
      setElementos(prev => prev.map(el => {
        if (el.id !== d.id) return el;
        if (el.tipo === "zona" && el.forma === "poly") {
          return { ...el, points: el.points.map(([px, py]) => [snap(px + dx), snap(py + dy)] as [number, number]) };
        }
        return { ...el, x: snap(d.ex + dx), y: snap(d.ey + dy) };
      }));
      dragRef.current = { ...d, ox: mx, oy: my, ex: snap(dragRef.current!.ex + dx), ey: snap(dragRef.current!.ey + dy) };
    }
  }

  function onSvgMouseUp(e: React.MouseEvent) {
    if (!svgRef.current) return;
    const [mx, my] = xy(e);

    if (tool === "zona-rect" && rectStart) {
      const x = Math.min(rectStart[0], mx);
      const y = Math.min(rectStart[1], my);
      const w = Math.abs(mx - rectStart[0]) || GRID * 4;
      const h = Math.abs(my - rectStart[1]) || GRID * 4;
      if (w > GRID && h > GRID) {
        const z: ZonaRect = { id: uid(), tipo: "zona", forma: "rect", x, y, w, h, label: zonaLabel, color: zonaColor };
        setElementos(prev => [z, ...prev]);
      }
      setRectStart(null); setRectCur(null);
    }
    dragRef.current = null;
  }

  function onSvgClick(e: React.MouseEvent) {
    if (!svgRef.current) return;
    const [mx, my] = xy(e);

    if (tool === "zona-poly") {
      if (polyPts.length > 2 && Math.hypot(mx - polyPts[0][0], my - polyPts[0][1]) < 20) {
        // close polygon
        const z: ZonaPoly = { id: uid(), tipo: "zona", forma: "poly", points: polyPts, closed: true, label: zonaLabel, color: zonaColor };
        setElementos(prev => [z, ...prev]);
        setPolyPts([]); setPolyCur(null);
      } else {
        setPolyPts(prev => [...prev, [mx, my]]);
      }
      return;
    }
    if (tool === "mesa-cuad" || tool === "mesa-redonda" || tool === "mesa-barra") {
      const forma = tool === "mesa-cuad" ? "cuad" : tool === "mesa-redonda" ? "redonda" : "barra";
      const def = MESA_DEFAULTS[forma];
      const m: Mesa = {
        id: uid(), tipo: "mesa", forma,
        x: mx - def.w / 2, y: my - def.h / 2,
        w: def.w, h: def.h,
        label: def.label, capacidad: def.capacidad, numero: mesaNum,
      };
      setMesaNum(n => n + 1);
      setElementos(prev => [...prev, m]);
      return;
    }
  }

  function onSvgDblClick(e: React.MouseEvent) {
    if (tool === "zona-poly" && polyPts.length >= 3) {
      const z: ZonaPoly = { id: uid(), tipo: "zona", forma: "poly", points: polyPts, closed: true, label: zonaLabel, color: zonaColor };
      setElementos(prev => [z, ...prev]);
      setPolyPts([]); setPolyCur(null);
    }
  }

  // ── element click (select / delete) ──
  function onElemClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (tool === "eliminar") {
      setElementos(prev => prev.filter(el => el.id !== id));
      if (selected === id) setSelected(null);
      return;
    }
    if (tool === "seleccionar") {
      setSelected(id === selected ? null : id);
    }
  }

  // ── element drag start ──
  function onElemMouseDown(e: React.MouseEvent, el: Elemento) {
    if (tool !== "seleccionar") return;
    e.stopPropagation();
    const [mx, my] = xy(e);
    const ex = el.tipo === "zona" && el.forma === "poly" ? 0 : (el as ZonaRect).x;
    const ey = el.tipo === "zona" && el.forma === "poly" ? 0 : (el as ZonaRect).y;
    dragRef.current = { id: el.id, ox: mx, oy: my, ex, ey };
    setSelected(el.id);
  }

  // ── update selected element property ──
  function updateEl<K extends keyof Mesa>(id: string, key: K, val: Mesa[K]) {
    setElementos(prev => prev.map(el => el.id !== id ? el : { ...el, [key]: val }));
  }

  // ── canvas click (deselect) ──
  function onCanvasClick() {
    if (tool === "seleccionar") setSelected(null);
    if (tool !== "zona-poly" && tool !== "zona-rect") return;
  }

  // ── keyboard ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setPolyPts([]); setPolyCur(null); setRectStart(null); setSelected(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !(e.target as Element).closest("input")) {
        setElementos(prev => prev.filter(el => el.id !== selected));
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // ─────────────────────────────────────────────────────────────────────────
  const TOOLS: { id: Herramienta; icon: string; label: string; group?: string }[] = [
    { id: "seleccionar",  icon: "↖",  label: "Seleccionar / Mover", group: "nav" },
    { id: "eliminar",     icon: "🗑",  label: "Eliminar",            group: "nav" },
    { id: "zona-rect",    icon: "⬜",  label: "Zona Rectángulo",     group: "zona" },
    { id: "zona-poly",    icon: "⬡",  label: "Zona Polígono",       group: "zona" },
    { id: "mesa-cuad",    icon: "⬛",  label: "Mesa Cuadrada",       group: "mesa" },
    { id: "mesa-redonda", icon: "⭕",  label: "Mesa Redonda",        group: "mesa" },
    { id: "mesa-barra",   icon: "▬",  label: "Mesa Barra",          group: "mesa" },
  ];

  const cursorMap: Record<Herramienta, string> = {
    seleccionar: "default", eliminar: "not-allowed",
    "zona-rect": "crosshair", "zona-poly": "crosshair",
    "mesa-cuad": "copy", "mesa-redonda": "copy", "mesa-barra": "copy",
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "20px 24px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Image src="/LogoCachoEcabra-white.png" alt="Cacho Cabra" width={80} height={28} style={{ height: "auto" }} />
          <div>
            <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: TEXT1, letterSpacing: "-0.02em" }}>
              Mapa de Mesas
            </div>
            <div style={{ fontSize: 14, color: TEXT3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              editor de planta · cacho &amp; cabra
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginLeft: "auto", flexWrap: "wrap" }}>
            {[
              { num: totalMesas,     label: "Mesas",    color: TEXT1  },
              { num: totalCapacidad, label: "Personas", color: AMR    },
            ].map(s => (
              <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 20px", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>{s.num}</span>
                <span style={{ fontSize: 14, color: TEXT3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              </div>
            ))}
          </div>
          {/* Acciones */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setElementos([]); setSelected(null); setMesaNum(1); }}
              style={{ fontSize: 15, color: TEXT3, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: FONT }}>
              Limpiar todo
            </button>
            <button onClick={() => { const d = JSON.stringify(elementos); localStorage.setItem("cacho-mapa-v1", d); }}
              style={{ fontSize: 15, color: "#1a1200", background: AMR, border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: FONT, fontWeight: 700 }}>
              Guardar
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* TOOLBAR LEFT */}
        <aside style={{ width: 200, flexShrink: 0, background: "#242220", borderRight: `1px solid ${BORDER}`, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>

          {/* Nav tools */}
          <div style={{ fontSize: 12, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, padding: "0 4px" }}>Navegación</div>
          {TOOLS.filter(t => t.group === "nav").map(t => (
            <ToolBtn key={t.id} active={tool === t.id} icon={t.icon} label={t.label} onClick={() => setTool(t.id)} />
          ))}

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />

          {/* Zona tools */}
          <div style={{ fontSize: 12, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, padding: "0 4px" }}>Zonas / Sectores</div>
          {TOOLS.filter(t => t.group === "zona").map(t => (
            <ToolBtn key={t.id} active={tool === t.id} icon={t.icon} label={t.label} onClick={() => setTool(t.id)} />
          ))}

          {/* Zona config */}
          {(tool === "zona-rect" || tool === "zona-poly") && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 10px", marginTop: 4 }}>
              <div style={{ fontSize: 13, color: TEXT3, marginBottom: 6 }}>Nombre del sector</div>
              <input value={zonaLabel} onChange={e => setZonaLabel(e.target.value)}
                style={{ width: "100%", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 10px", fontSize: 15, fontFamily: FONT, color: TEXT1, outline: "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 13, color: TEXT3, margin: "8px 0 6px" }}>Color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ZONA_PRESETS.map(p => (
                  <button key={p.color} onClick={() => { setZonaColor(p.color); setZonaLabel(p.label); }}
                    title={p.label}
                    style={{
                      width: 22, height: 22, borderRadius: 5, border: zonaColor === p.color ? `2px solid ${TEXT1}` : `1px solid ${BORDER}`,
                      background: p.color + "99", cursor: "pointer",
                    }} />
                ))}
              </div>
              {tool === "zona-poly" && polyPts.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: TEXT3 }}>
                  {polyPts.length} puntos · Doble-click o cierra el polígono para terminar
                </div>
              )}
              {tool === "zona-rect" && (
                <div style={{ marginTop: 8, fontSize: 13, color: TEXT3 }}>
                  Arrastra para dibujar el área
                </div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />

          {/* Mesa tools */}
          <div style={{ fontSize: 12, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, padding: "0 4px" }}>Mesas</div>
          {TOOLS.filter(t => t.group === "mesa").map(t => (
            <ToolBtn key={t.id} active={tool === t.id} icon={t.icon} label={t.label} onClick={() => setTool(t.id)} />
          ))}
          {(tool === "mesa-cuad" || tool === "mesa-redonda" || tool === "mesa-barra") && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 10px", marginTop: 4, fontSize: 13, color: TEXT3 }}>
              Haz click en el canvas para colocar
            </div>
          )}

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />

          {/* Legend */}
          <div style={{ fontSize: 12, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, padding: "0 4px" }}>Sectores</div>
          {ZONA_PRESETS.map(p => (
            <div key={p.color} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px" }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color + "99", border: `1px solid ${p.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: TEXT2 }}>{p.label}</span>
            </div>
          ))}

          <div style={{ marginTop: "auto", paddingTop: 12, fontSize: 12, color: TEXT3, lineHeight: 1.6 }}>
            <div>Del · Backspace — eliminar seleccionado</div>
            <div>Esc — cancelar / deseleccionar</div>
            <div>Dbl-click — cerrar polígono</div>
          </div>
        </aside>

        {/* CANVAS */}
        <div style={{ flex: 1, overflow: "auto", position: "relative", background: "#1a1814" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CW} ${CH}`}
            style={{ width: "100%", minWidth: 600, display: "block", cursor: cursorMap[tool] }}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onClick={onSvgClick}
            onDoubleClick={onSvgDblClick}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#3a3632" strokeWidth="0.5" />
              </pattern>
              <pattern id="grid-major" width={GRID * 5} height={GRID * 5} patternUnits="userSpaceOnUse">
                <rect width={GRID * 5} height={GRID * 5} fill="url(#grid)" />
                <path d={`M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}`} fill="none" stroke="#4a4540" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={CW} height={CH} fill="url(#grid-major)" />

            {/* Zonas (rendered first / below) */}
            {elementos.filter(e => e.tipo === "zona").map(el => {
              const z = el as ZonaRect | ZonaPoly;
              const sel = selected === z.id;
              if (z.forma === "rect") {
                const zr = z as ZonaRect;
                const [lx, ly] = [zr.x + zr.w / 2, zr.y + zr.h / 2];
                return (
                  <g key={z.id} style={{ cursor: tool === "seleccionar" ? "move" : tool === "eliminar" ? "not-allowed" : "default" }}
                    onMouseDown={e => onElemMouseDown(e, z)} onClick={e => onElemClick(e, z.id)}>
                    <rect x={zr.x} y={zr.y} width={zr.w} height={zr.h}
                      fill={z.color + "30"} stroke={z.color}
                      strokeWidth={sel ? 2.5 : 1.5}
                      strokeDasharray={sel ? "none" : "none"}
                      rx={6}
                    />
                    {sel && <rect x={zr.x} y={zr.y} width={zr.w} height={zr.h} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} rx={6} />}
                    <text x={lx} y={zr.y + 18} textAnchor="middle" fill={z.color} fontSize={13} fontWeight={700}
                      style={{ fontFamily: "var(--font-dm),sans-serif", pointerEvents: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {z.label}
                    </text>
                  </g>
                );
              } else {
                const zp = z as ZonaPoly;
                const [cx, cy] = polyCentroid(zp.points);
                return (
                  <g key={z.id} style={{ cursor: tool === "seleccionar" ? "move" : "default" }}
                    onMouseDown={e => onElemMouseDown(e, z)} onClick={e => onElemClick(e, z.id)}>
                    <path d={polyPath(zp.points, zp.closed)} fill={z.color + "30"} stroke={z.color}
                      strokeWidth={sel ? 2.5 : 1.5} rx={6} />
                    {sel && <path d={polyPath(zp.points, zp.closed)} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} />}
                    <text x={cx} y={cy + 5} textAnchor="middle" fill={z.color} fontSize={13} fontWeight={700}
                      style={{ fontFamily: "var(--font-dm),sans-serif", pointerEvents: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {z.label}
                    </text>
                  </g>
                );
              }
            })}

            {/* Mesas */}
            {(elementos.filter(e => e.tipo === "mesa") as Mesa[]).map(m => {
              const sel = selected === m.id;
              const chairs = chairPositions(m.x, m.y, m.w, m.h, m.capacidad, m.forma);
              const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
              return (
                <g key={m.id} style={{ cursor: tool === "seleccionar" ? "move" : tool === "eliminar" ? "not-allowed" : "default" }}
                  onMouseDown={e => onElemMouseDown(e, m)} onClick={e => onElemClick(e, m.id)}>

                  {/* Sillas */}
                  {chairs.map(([cx2, cy2], i) => (
                    <rect key={i} x={cx2 - 7} y={cy2 - 7} width={14} height={14} rx={3}
                      fill={sel ? "#6b6560" : "#504b46"} stroke={BORDER} strokeWidth={1} />
                  ))}

                  {/* Mesa body */}
                  {m.forma === "redonda"
                    ? <ellipse cx={cx} cy={cy} rx={m.w / 2} ry={m.h / 2}
                        fill={sel ? "#5a5248" : SURFACE} stroke={sel ? AMR : "#706860"} strokeWidth={sel ? 2 : 1.5} />
                    : <rect x={m.x} y={m.y} width={m.w} height={m.h} rx={m.forma === "barra" ? 4 : 6}
                        fill={sel ? "#5a5248" : SURFACE} stroke={sel ? AMR : "#706860"} strokeWidth={sel ? 2 : 1.5} />
                  }

                  {/* Número */}
                  <text x={cx} y={cy - 6} textAnchor="middle" fill={sel ? AMR : TEXT2} fontSize={14} fontWeight={800}
                    style={{ fontFamily: "var(--font-raleway),sans-serif", pointerEvents: "none" }}>
                    {m.numero}
                  </text>
                  {/* Capacidad */}
                  <text x={cx} y={cy + 10} textAnchor="middle" fill={TEXT3} fontSize={10}
                    style={{ fontFamily: "var(--font-dm),sans-serif", pointerEvents: "none" }}>
                    {m.capacidad}p
                  </text>
                </g>
              );
            })}

            {/* Drawing preview — rect */}
            {tool === "zona-rect" && rectStart && rectCur && (
              <rect
                x={Math.min(rectStart[0], rectCur[0])} y={Math.min(rectStart[1], rectCur[1])}
                width={Math.abs(rectCur[0] - rectStart[0])} height={Math.abs(rectCur[1] - rectStart[1])}
                fill={zonaColor + "20"} stroke={zonaColor} strokeWidth={1.5} strokeDasharray="6 3" rx={6}
              />
            )}

            {/* Drawing preview — poly */}
            {tool === "zona-poly" && polyPts.length > 0 && (
              <>
                <path d={polyPath(polyPts, false)} fill="none" stroke={zonaColor} strokeWidth={1.5} strokeDasharray="5 3" />
                {polyCur && <line x1={polyPts[polyPts.length - 1][0]} y1={polyPts[polyPts.length - 1][1]}
                  x2={polyCur[0]} y2={polyCur[1]} stroke={zonaColor} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />}
                {polyPts.map(([px, py], i) => (
                  <circle key={i} cx={px} cy={py} r={i === 0 ? 6 : 4}
                    fill={i === 0 ? zonaColor : SURFACE} stroke={zonaColor} strokeWidth={1.5} />
                ))}
              </>
            )}
          </svg>
        </div>

        {/* PANEL DERECHO */}
        <aside style={{ width: 220, flexShrink: 0, background: "#242220", borderLeft: `1px solid ${BORDER}`, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

          {selectedEl ? (
            <>
              <div style={{ fontFamily: TITLE, fontSize: 17, fontWeight: 800, color: TEXT1 }}>
                {selectedEl.tipo === "zona" ? "Zona" : "Mesa"} seleccionada
              </div>
              {/* Label */}
              <div>
                <div style={{ fontSize: 13, color: TEXT3, marginBottom: 4 }}>Nombre</div>
                <input
                  value={selectedEl.label}
                  onChange={e => updateEl(selectedEl.id, "label", e.target.value)}
                  style={{ width: "100%", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 10px", fontSize: 15, fontFamily: FONT, color: TEXT1, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Mesa props */}
              {selectedEl.tipo === "mesa" && (
                <>
                  <div>
                    <div style={{ fontSize: 13, color: TEXT3, marginBottom: 4 }}>Nº de mesa</div>
                    <input type="number" min={1}
                      value={(selectedEl as Mesa).numero}
                      onChange={e => updateEl(selectedEl.id, "numero", parseInt(e.target.value) || 1)}
                      style={{ width: "100%", background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 10px", fontSize: 15, fontFamily: FONT, color: TEXT1, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: TEXT3, marginBottom: 8 }}>Capacidad (sillas)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => updateEl(selectedEl.id, "capacidad", Math.max(1, (selectedEl as Mesa).capacidad - 1))}
                        style={{ width: 32, height: 32, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT1, fontSize: 18, cursor: "pointer", fontFamily: FONT }}>−</button>
                      <span style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: AMR, minWidth: 32, textAlign: "center" }}>
                        {(selectedEl as Mesa).capacidad}
                      </span>
                      <button onClick={() => updateEl(selectedEl.id, "capacidad", Math.min(20, (selectedEl as Mesa).capacidad + 1))}
                        style={{ width: 32, height: 32, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT1, fontSize: 18, cursor: "pointer", fontFamily: FONT }}>+</button>
                    </div>
                  </div>
                  {/* Tamaño */}
                  <div>
                    <div style={{ fontSize: 13, color: TEXT3, marginBottom: 4 }}>Tamaño</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { label: "S", w: 50,  h: 50  },
                        { label: "M", w: 60,  h: 60  },
                        { label: "L", w: 80,  h: 80  },
                        { label: "XL",w: 100, h: 100 },
                      ].map(sz => (
                        <button key={sz.label} onClick={() => { updateEl(selectedEl.id, "w", sz.w); updateEl(selectedEl.id, "h", sz.h); }}
                          style={{
                            flex: 1, padding: "6px 0", background: (selectedEl as Mesa).w === sz.w ? AMR : SURF2,
                            color: (selectedEl as Mesa).w === sz.w ? "#1a1200" : TEXT2,
                            border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                          }}>
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Zona props */}
              {selectedEl.tipo === "zona" && (
                <div>
                  <div style={{ fontSize: 13, color: TEXT3, marginBottom: 6 }}>Color</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {ZONA_PRESETS.map(p => (
                      <button key={p.color} title={p.label} onClick={() => setElementos(prev => prev.map(el => el.id !== selectedEl.id ? el : { ...el, color: p.color }))}
                        style={{
                          width: 24, height: 24, borderRadius: 5, cursor: "pointer",
                          background: p.color + "99", border: (selectedEl as ZonaRect).color === p.color ? `2px solid ${TEXT1}` : `1px solid ${BORDER}`,
                        }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Eliminar */}
              <button onClick={() => { setElementos(prev => prev.filter(el => el.id !== selectedEl.id)); setSelected(null); }}
                style={{ marginTop: "auto", fontSize: 15, color: "#fca5a5", background: "#2a1212", border: `1px solid #6b2020`, borderRadius: 10, padding: "8px 0", cursor: "pointer", fontFamily: FONT }}>
                🗑 Eliminar
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: TITLE, fontSize: 17, fontWeight: 800, color: TEXT1, marginBottom: 4 }}>
                Resumen
              </div>
              {/* By zone capacity */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(elementos.filter(e => e.tipo === "zona") as (ZonaRect | ZonaPoly)[]).map(z => {
                  const zx = z.forma === "rect" ? (z as ZonaRect).x : 0;
                  const zy = z.forma === "rect" ? (z as ZonaRect).y : 0;
                  const zw = z.forma === "rect" ? (z as ZonaRect).w : 9999;
                  const zh = z.forma === "rect" ? (z as ZonaRect).h : 9999;
                  const mesasEnZona = (elementos.filter(e => e.tipo === "mesa") as Mesa[])
                    .filter(m => m.x >= zx && m.x + m.w <= zx + zw && m.y >= zy && m.y + m.h <= zy + zh);
                  const cap = mesasEnZona.reduce((s, m) => s + m.capacidad, 0);
                  return (
                    <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: z.color + "99", border: `1px solid ${z.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 15, color: TEXT2, flex: 1 }}>{z.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: z.color }}>{cap}p</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 1, background: BORDER }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, color: TEXT2 }}>Total capacidad</span>
                <span style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: AMR }}>{totalCapacidad}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, color: TEXT2 }}>Total mesas</span>
                <span style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: TEXT1 }}>{totalMesas}</span>
              </div>
              <div style={{ marginTop: 8, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 12px", fontSize: 14, color: TEXT3, lineHeight: 1.7 }}>
                <div>Selecciona una mesa o zona para ver sus propiedades.</div>
                <div style={{ marginTop: 6 }}>Arrastra para mover. Usa las herramientas de la izquierda para agregar elementos.</div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── ToolBtn component ────────────────────────────────────────────────────────
function ToolBtn({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
        background: active ? AMR : "transparent",
        color: active ? "#1a1200" : TEXT2,
        border: active ? "none" : `1px solid transparent`,
        borderRadius: 8, padding: "7px 10px", cursor: "pointer",
        fontFamily: FONT, fontSize: 15, fontWeight: active ? 700 : 500,
        transition: "all 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = SURF2; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 16, minWidth: 18, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_ELEMENTOS: Elemento[] = [
  { id: "z1", tipo: "zona", forma: "rect", x: 40,  y: 40,  w: 440, h: 380, label: "Salón",   color: "#FBBF24" },
  { id: "z2", tipo: "zona", forma: "rect", x: 520, y: 40,  w: 320, h: 220, label: "Terraza", color: "#34d399" },
  { id: "z3", tipo: "zona", forma: "rect", x: 520, y: 300, w: 320, h: 120, label: "Barra",   color: "#60a5fa" },
  { id: "z4", tipo: "zona", forma: "rect", x: 40,  y: 460, w: 800, h: 180, label: "Escenario",color: "#a78bfa" },
  // mesas salón
  { id: "m1", tipo: "mesa", forma: "cuad",    x: 80,  y: 90,  w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 1 },
  { id: "m2", tipo: "mesa", forma: "cuad",    x: 200, y: 90,  w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 2 },
  { id: "m3", tipo: "mesa", forma: "cuad",    x: 320, y: 90,  w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 3 },
  { id: "m4", tipo: "mesa", forma: "redonda", x: 80,  y: 220, w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 4 },
  { id: "m5", tipo: "mesa", forma: "redonda", x: 200, y: 220, w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 5 },
  { id: "m6", tipo: "mesa", forma: "redonda", x: 320, y: 220, w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 6 },
  // mesas terraza
  { id: "m7", tipo: "mesa", forma: "cuad",    x: 560, y: 80,  w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 7 },
  { id: "m8", tipo: "mesa", forma: "cuad",    x: 680, y: 80,  w: 60, h: 60, label: "Mesa", capacidad: 4, numero: 8 },
  { id: "m9", tipo: "mesa", forma: "cuad",    x: 560, y: 180, w: 60, h: 60, label: "Mesa", capacidad: 2, numero: 9 },
  { id: "m10",tipo: "mesa", forma: "cuad",    x: 680, y: 180, w: 60, h: 60, label: "Mesa", capacidad: 2, numero: 10 },
  // barra
  { id: "m11",tipo: "mesa", forma: "barra",   x: 540, y: 330, w: 160, h: 40, label: "Barra", capacidad: 6, numero: 11 },
];
