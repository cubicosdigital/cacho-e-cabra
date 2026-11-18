/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) solo entiende <img>, no next/image. */
import { ImageResponse } from "next/og";
import { zipSync } from "fflate";
import { AMBAR, ROJO, TEXTO, TENUE, pngAJpg, recursos, type Recursos } from "./diseno";
import { etiquetaDia, platosLimpios, precioTexto, type BorradorMenu, type PlatoMenu } from "./menu-dia";

// Gráficas del menú del día para redes: una historia (con todos los platos) y un carrusel
// (portada + una lámina por plato). Mismo estilo minimalista que la web:
// fondo oscuro cálido, ámbar, Raleway/DM Sans y mucho aire. Se dibuja en el servidor
// y de ahí salen la vista previa del admin, las descargas en JPG y la imagen de la web.

export type Lamina = { tipo: "historia" } | { tipo: "portada" } | { tipo: "plato"; n: number };

export const HISTORIA = { ancho: 1080, alto: 1920 };
export const CARRUSEL = { ancho: 1080, alto: 1350 };

const FONDO = "linear-gradient(160deg, #2d2b27 0%, #1b1917 100%)";
const SITIO = "cachocabrabar.cl · Del Canelo N° 439 · Llolleo";

// ── Piezas ───────────────────────────────────────────────────────────────────

const flechaUri = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" fill="none" stroke="${AMBAR}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h42M34 3l10 9-10 9"/></svg>`,
).toString("base64")}`;

function Etiqueta({ texto, size = 28 }: { texto: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", width: 52, height: 5, backgroundColor: ROJO, marginRight: 20 }} />
      <div style={{ display: "flex", fontSize: size, fontWeight: 700, letterSpacing: 11, color: AMBAR }}>{texto}</div>
      <div style={{ display: "flex", width: 52, height: 5, backgroundColor: ROJO, marginLeft: 20 }} />
    </div>
  );
}

/** Tamaño del día de la semana (en cursiva) según su largo, para que "Miércoles" quepa igual que "Lunes". */
const tamanoDia = (dia: string, max: number, ancho: number) => Math.min(max, Math.floor(ancho / (Math.max(dia.length, 1) * 0.56)));

const lineas = (texto: string, size: number, ancho: number) => Math.max(1, Math.ceil((texto.length * size * 0.56) / ancho));

/** El mayor tamaño de letra con el que la lista completa entra en el alto disponible. */
function tamanoLista(platos: PlatoMenu[], alto: number, ancho: number): number {
  for (let s = 54; s >= 22; s -= 2) {
    const platosAlto = platos.reduce(
      (acc, p) =>
        acc +
        lineas(p.nombre, s, ancho) * s * 1.2 +
        (p.descripcion ? lineas(p.descripcion, s * 0.7, ancho) * s * 0.7 * 1.3 + 6 : 0) +
        (p.precio != null ? s * 1.15 + 10 : 0),
      0,
    );
    if (platosAlto + (platos.length - 1) * (s + 3) <= alto) return s;
  }
  return 22;
}

function horaTexto(hora: string) {
  return `Desde las ${hora} hrs`;
}

// ── Historia ─────────────────────────────────────────────────────────────────

function historia(m: BorradorMenu, r: Recursos) {
  const { ancho, alto } = HISTORIA;
  const { dia, fecha } = etiquetaDia(m.fecha);
  const platos = platosLimpios(m.platos);
  // Con muchos platos el encabezado se achica para dejarles más lugar.
  const compacto = platos.length > 5;
  const s = tamanoLista(platos, compacto ? 940 : 880, 860);
  const gap = Math.round(s * 0.5);

  return (
    <div style={{ width: ancho, height: alto, display: "flex", position: "relative", fontFamily: "DM Sans", color: TEXTO, backgroundImage: FONDO }}>
      <div style={{ position: "absolute", left: 0, top: 640, width: ancho, height: 760, display: "flex", backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.10) 0%, rgba(251,191,36,0) 68%)" }} />
      <div style={{ position: "absolute", left: 140, top: 0, width: 800, height: 460, display: "flex", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(196,38,46,0.20) 0%, rgba(196,38,46,0) 70%)" }} />
      <div style={{ position: "absolute", left: 36, top: 36, right: 36, bottom: 36, display: "flex", border: "2px solid rgba(251,191,36,0.4)", borderRadius: 44 }} />

      <div style={{ position: "absolute", left: 90, right: 90, top: 120, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={r.logo} width={compacto ? 250 : 330} height={compacto ? 87 : 115} alt="Cacho Cabra" />
          <div style={{ display: "flex", marginTop: compacto ? 26 : 44 }}><Etiqueta texto="MENÚ DEL DÍA" /></div>
          <div style={{ display: "flex", marginTop: 14, fontFamily: "Pacifico", fontWeight: 400, fontSize: tamanoDia(dia, compacto ? 120 : 170, 860), lineHeight: 1.25 }}>{dia}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: compacto ? 32 : 38, fontWeight: 500, color: TENUE }}>{fecha}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 860, margin: "28px 0" }}>
          {platos.map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 860 }}>
              {i > 0 && <div style={{ display: "flex", width: 56, height: 3, margin: `${gap}px 0`, backgroundColor: "rgba(251,191,36,0.45)" }} />}
              <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: "Pacifico", fontWeight: 400, fontSize: Math.round(s * 1.05), lineHeight: 1.3 }}>{p.nombre}</div>
              {p.descripcion ? (
                <div style={{ display: "flex", justifyContent: "center", textAlign: "center", marginTop: 14, fontSize: Math.round(s * 0.7), fontWeight: 500, lineHeight: 1.3, color: TENUE }}>{p.descripcion}</div>
              ) : null}
              {p.precio != null ? (
                <div style={{ display: "flex", marginTop: 10, fontFamily: "Raleway", fontWeight: 900, fontSize: Math.round(s * 1.15), lineHeight: 1.1, color: AMBAR }}>{precioTexto(p.precio)}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: AMBAR }}>{horaTexto(m.horaDesde)}</div>
          {m.nota ? <div style={{ display: "flex", marginTop: 10, fontSize: 30, fontWeight: 500, color: TEXTO, textAlign: "center" }}>{m.nota}</div> : null}
          <div style={{ display: "flex", marginTop: 26, fontSize: 24, fontWeight: 500, color: TENUE }}>{SITIO}</div>
        </div>
      </div>
    </div>
  );
}

// ── Carrusel: portada ────────────────────────────────────────────────────────

function portada(m: BorradorMenu, r: Recursos) {
  const { ancho, alto } = CARRUSEL;
  const { dia, fecha } = etiquetaDia(m.fecha);
  const n = platosLimpios(m.platos).length;

  return (
    <div style={{ width: ancho, height: alto, display: "flex", position: "relative", fontFamily: "DM Sans", color: TEXTO, backgroundImage: FONDO }}>
      <div style={{ position: "absolute", left: 0, top: 330, width: ancho, height: 700, display: "flex", backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0) 68%)" }} />
      <div style={{ position: "absolute", left: 140, top: 0, width: 800, height: 460, display: "flex", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(196,38,46,0.22) 0%, rgba(196,38,46,0) 70%)" }} />
      <div style={{ position: "absolute", left: 36, top: 36, right: 36, bottom: 36, display: "flex", border: "2px solid rgba(251,191,36,0.4)", borderRadius: 44 }} />

      <div style={{ position: "absolute", left: 90, right: 90, top: 110, bottom: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
        <img src={r.logo} width={380} height={132} alt="Cacho Cabra" />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Etiqueta texto="MENÚ DEL DÍA" />
          <div style={{ display: "flex", marginTop: 26, fontFamily: "Pacifico", fontWeight: 400, fontSize: tamanoDia(dia, 220, 860), lineHeight: 1.25 }}>{dia}</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 46, fontWeight: 500, color: TENUE }}>{fecha}</div>
          <div style={{ display: "flex", width: 90, height: 3, marginTop: 44, backgroundColor: "rgba(251,191,36,0.5)" }} />
          <div style={{ display: "flex", marginTop: 40, fontSize: 40, fontWeight: 700, color: AMBAR }}>{horaTexto(m.horaDesde)}</div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 30, fontWeight: 500, color: TENUE }}>{`${n} ${n === 1 ? "opción" : "opciones"} para elegir`}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 26, fontWeight: 700, letterSpacing: 5, color: TENUE }}>
          DESLIZA
          <img src={flechaUri} width={54} height={27} alt="" style={{ marginLeft: 18 }} />
        </div>
      </div>
    </div>
  );
}

// ── Carrusel: una lámina por plato ───────────────────────────────────────────

/**
 * El título del plato en una o dos líneas parejas (nunca una palabra suelta) y el mayor
 * tamaño de letra con el que la línea más larga cabe en el ancho de la lámina.
 */
function tituloEnLineas(titulo: string): { lineas: string[]; size: number } {
  const palabras = titulo.trim().split(/\s+/);
  let lineas = [palabras.join(" ")];
  if (lineas[0].length > 14 && palabras.length > 1) {
    let mejor = 1;
    let dif = Infinity;
    for (let i = 1; i < palabras.length; i++) {
      const d = Math.abs(palabras.slice(0, i).join(" ").length - palabras.slice(i).join(" ").length);
      if (d < dif) { dif = d; mejor = i; }
    }
    lineas = [palabras.slice(0, mejor).join(" "), palabras.slice(mejor).join(" ")];
  }
  const maxLargo = Math.max(...lineas.map(l => l.length), 1);
  return { lineas, size: Math.max(52, Math.min(130, Math.floor(900 / (maxLargo * 0.56)))) };
}

function lamina(m: BorradorMenu, r: Recursos, plato: PlatoMenu, n: number, total: number) {
  const { ancho, alto } = CARRUSEL;
  const { dia, fecha } = etiquetaDia(m.fecha);
  const { lineas, size: tituloSize } = tituloEnLineas(plato.nombre);
  const detalleSize = plato.descripcion.length <= 40 ? 50 : plato.descripcion.length <= 70 ? 42 : 36;

  return (
    <div style={{ width: ancho, height: alto, display: "flex", position: "relative", fontFamily: "DM Sans", color: TEXTO, backgroundImage: FONDO }}>
      <div style={{ position: "absolute", left: 0, top: 300, width: ancho, height: 760, display: "flex", backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.13) 0%, rgba(251,191,36,0) 68%)" }} />
      <div style={{ position: "absolute", left: 140, top: 0, width: 800, height: 420, display: "flex", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(196,38,46,0.2) 0%, rgba(196,38,46,0) 70%)" }} />
      <div style={{ position: "absolute", left: 36, top: 36, right: 36, bottom: 36, display: "flex", border: "2px solid rgba(251,191,36,0.4)", borderRadius: 44 }} />

      <div style={{ position: "absolute", left: 90, right: 90, top: 100, bottom: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", width: 900, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 40, height: 4, backgroundColor: ROJO, marginRight: 16 }} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 6, color: AMBAR }}>{`${dia.toUpperCase()} ${fecha.toUpperCase()}`}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: TENUE }}>{`${n} / ${total}`}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 900 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Pacifico", fontWeight: 400, fontSize: tituloSize, lineHeight: 1.3 }}>
            {lineas.map((l, i) => <div key={i} style={{ display: "flex" }}>{l}</div>)}
          </div>
          <div style={{ display: "flex", width: 90, height: 4, marginTop: 40, backgroundColor: "rgba(251,191,36,0.55)" }} />
          {plato.descripcion ? (
            <div style={{ display: "flex", justifyContent: "center", textAlign: "center", marginTop: 40, fontSize: detalleSize, fontWeight: 500, lineHeight: 1.3, color: "#e7e0d8" }}>{plato.descripcion}</div>
          ) : null}
          {plato.precio != null ? (
            <div style={{ display: "flex", marginTop: plato.descripcion ? 56 : 44, fontFamily: "Raleway", fontWeight: 900, fontSize: 112, lineHeight: 1, color: AMBAR }}>{precioTexto(plato.precio)}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={r.logo} width={190} height={66} alt="" style={{ opacity: 0.9 }} />
          <div style={{ display: "flex", marginTop: 18, fontSize: 26, fontWeight: 500, color: TENUE }}>{`${horaTexto(m.horaDesde)} · cachocabrabar.cl`}</div>
        </div>
      </div>
    </div>
  );
}

// ── Salida ───────────────────────────────────────────────────────────────────

async function dibujar(el: React.ReactElement, ancho: number, alto: number, r: Recursos): Promise<Buffer> {
  const res = new ImageResponse(el, { width: ancho, height: alto, fonts: r.fuentes });
  return pngAJpg(Buffer.from(await res.arrayBuffer()));
}

/** Una lámina del menú como JPG. Lanza si el plato pedido no existe. */
export async function renderLaminaJpg(menu: BorradorMenu, lam: Lamina): Promise<Buffer> {
  const r = await recursos();
  if (lam.tipo === "historia") return dibujar(historia(menu, r), HISTORIA.ancho, HISTORIA.alto, r);
  if (lam.tipo === "portada") return dibujar(portada(menu, r), CARRUSEL.ancho, CARRUSEL.alto, r);

  const platos = platosLimpios(menu.platos);
  const plato = platos[lam.n - 1];
  if (!plato) throw new Error(`El menú no tiene el plato ${lam.n}`);
  return dibujar(lamina(menu, r, plato, lam.n, platos.length), CARRUSEL.ancho, CARRUSEL.alto, r);
}

export function nombreArchivo(menu: BorradorMenu, lam: Lamina): string {
  const base = `menu-${menu.fecha}`;
  if (lam.tipo === "historia") return `${base}-historia.jpg`;
  if (lam.tipo === "portada") return `${base}-carrusel-1-portada.jpg`;
  return `${base}-carrusel-${lam.n + 1}-plato-${lam.n}.jpg`;
}

/** Historia + carrusel completo (portada y un plato por lámina) en un ZIP, para bajarlo de una vez. */
export async function renderPaqueteZip(menu: BorradorMenu): Promise<Buffer> {
  const total = platosLimpios(menu.platos).length;
  const laminas: Lamina[] = [{ tipo: "historia" }, { tipo: "portada" }, ...Array.from({ length: total }, (_, i): Lamina => ({ tipo: "plato", n: i + 1 }))];
  const archivos: Record<string, Uint8Array> = {};
  for (const lam of laminas) archivos[nombreArchivo(menu, lam)] = new Uint8Array(await renderLaminaJpg(menu, lam));
  // Los JPG ya vienen comprimidos: el ZIP solo los junta (nivel 0).
  return Buffer.from(zipSync(archivos, { level: 0 }));
}
