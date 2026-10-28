/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) solo entiende <img>, no next/image. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CONDICIONES, fechaCorta, miles, urlGiftcard, type DatosTarjeta } from "./giftcards";
import { qrSvgDataUri } from "./giftcard-qr";

// Diseño de la gift card. Se dibuja UNA sola vez, en el servidor, y de ahí salen
// la vista previa del admin, el link público, el PDF y la imagen que ve WhatsApp:
// lo que se ve en pantalla es exactamente lo que se envía.
//
// Solo se puede usar el subconjunto de CSS que entiende Satori (flexbox, posiciones
// absolutas, gradientes). Todo contenedor con más de un hijo lleva display:flex.

export const ANCHO = 1200;
export const ALTO = 630;

const AMBAR = "#FBBF24";
const ROJO = "#c4262e";
const TEXTO = "#f5f2ee";
const TENUE = "#b0a89f";

type Fuentes = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;
interface Recursos { fuentes: Fuentes; logo: string; cachos: string }

let cache: Promise<Recursos> | null = null;

async function cargar(): Promise<Recursos> {
  const raiz = process.cwd();
  const [raleway, dm500, dm700, logo, cachos] = await Promise.all([
    readFile(join(raiz, "assets/fonts/raleway-latin-900-normal.woff")),
    readFile(join(raiz, "assets/fonts/dm-sans-latin-500-normal.woff")),
    readFile(join(raiz, "assets/fonts/dm-sans-latin-700-normal.woff")),
    readFile(join(raiz, "public/LogoCachoEcabra-white.png")),
    readFile(join(raiz, "public/giftcard-cachos.png")),
  ]);
  return {
    fuentes: [
      { name: "Raleway", data: raleway, weight: 900, style: "normal" },
      { name: "DM Sans", data: dm500, weight: 500, style: "normal" },
      { name: "DM Sans", data: dm700, weight: 700, style: "normal" },
    ],
    logo: `data:image/png;base64,${logo.toString("base64")}`,
    cachos: `data:image/png;base64,${cachos.toString("base64")}`,
  };
}

/** Los recursos no cambian entre peticiones: se leen una vez. Si falla, se reintenta en la siguiente. */
function recursos(): Promise<Recursos> {
  if (!cache) cache = cargar().catch(e => { cache = null; throw e; });
  return cache;
}

/** Cuanto más largo el monto, más chico se dibuja para que siempre quepa. */
function tamanoValor(texto: string, max: number) {
  return Math.max(80, Math.min(max, Math.floor(1000 / texto.length)));
}

/** Cuanto más largo el mensaje, más chica la letra: así siempre cabe completo en 3 líneas, sin cortarse. */
function tamanoMensaje(texto: string) {
  const size = texto.length <= 60 ? 29 : texto.length <= 95 ? 26 : 23;
  return { size, alto: Math.ceil(size * 1.32 * 3) };
}

/** Los códigos numéricos (6 dígitos) se dibujan grandes; uno largo se achica para que quepa en la lengüeta. */
function tamanoCodigo(codigo: string, conQr: boolean) {
  if (codigo.length <= 8) return conQr ? 42 : 48;
  return conQr ? 30 : 33;
}

function Etiqueta({ children, margen = 0 }: { children: string; margen?: number }) {
  return (
    <div style={{ display: "flex", fontSize: 17, fontWeight: 700, letterSpacing: 6, color: TENUE, marginTop: margen }}>
      {children}
    </div>
  );
}

function tarjeta(d: DatosTarjeta, r: Recursos, qr: string | null) {
  const esPorcentaje = d.tipo === "porcentaje";
  const textoMonto = `$${miles(d.valor)}`;
  const textoPct = `${d.valor}%`;
  const vence = fechaCorta(d.vence);

  return (
    <div
      style={{
        width: ANCHO, height: ALTO, display: "flex", position: "relative", fontFamily: "DM Sans", color: TEXTO,
        backgroundImage: "linear-gradient(135deg, #2d2b27 0%, #1b1917 100%)",
      }}
    >
      {/* Resplandor cálido detrás del valor */}
      <div
        style={{
          position: "absolute", left: 120, top: 150, width: 700, height: 420, display: "flex",
          backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.14) 0%, rgba(251,191,36,0) 70%)",
        }}
      />

      {/* Marco */}
      <div
        style={{
          position: "absolute", left: 22, top: 22, right: 22, bottom: 22, display: "flex",
          border: "2px solid rgba(251,191,36,0.5)", borderRadius: 30,
        }}
      />

      {/* Lengüeta del código (como un ticket). Las gift cards en $ llevan QR; las de % no. */}
      <div
        style={{
          position: "absolute", right: 24, top: 24, bottom: 24, width: 326, display: "flex", flexDirection: "column", alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.04)", borderLeft: "3px dashed rgba(251,191,36,0.45)",
          borderTopRightRadius: 28, borderBottomRightRadius: 28, paddingTop: qr ? 34 : 52,
        }}
      >
        {qr ? (
          <div style={{ display: "flex", backgroundColor: "#ffffff", borderRadius: 14, padding: 9 }}>
            <img src={qr} width={190} height={190} alt="" />
          </div>
        ) : (
          <img src={r.cachos} width={190} height={65} alt="" />
        )}

        <Etiqueta margen={qr ? 16 : 30}>CÓDIGO</Etiqueta>
        <div style={{ display: "flex", marginTop: qr ? 6 : 8, fontSize: tamanoCodigo(d.codigo, !!qr), fontWeight: 700, letterSpacing: d.codigo.length <= 8 ? 5 : 2, color: AMBAR }}>{d.codigo}</div>

        {!qr && <div style={{ display: "flex", width: 60, height: 2, marginTop: 24, backgroundColor: "rgba(251,191,36,0.4)" }} />}

        {d.para ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: qr ? 14 : 22 }}>
            <Etiqueta>PARA</Etiqueta>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 5, maxWidth: 270, maxHeight: qr ? 58 : 68, overflow: "hidden", fontSize: qr ? 24 : 28, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>
              {d.para}
            </div>
          </div>
        ) : null}

        {vence ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: qr ? 12 : 20 }}>
            <Etiqueta>VÁLIDA HASTA</Etiqueta>
            <div style={{ display: "flex", marginTop: 5, fontSize: qr ? 23 : 26, fontWeight: 700 }}>{vence}</div>
          </div>
        ) : null}

        <div style={{ position: "absolute", bottom: qr ? 30 : 40, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {!qr && <div style={{ display: "flex", fontSize: 17, color: TENUE, fontWeight: 500 }}>Del Canelo N° 439 · Llolleo</div>}
          <div style={{ display: "flex", marginTop: qr ? 0 : 4, fontSize: 19, color: AMBAR, fontWeight: 700 }}>cachocabrabar.cl</div>
        </div>
      </div>

      {/* Condiciones de uso (letra chica) */}
      <div style={{ position: "absolute", left: 74, bottom: 30, display: "flex", fontSize: 21, fontWeight: 700, color: TENUE }}>
        {CONDICIONES}
      </div>

      {/* Lengüeta roja de marca en el borde */}
      <div style={{ position: "absolute", left: 22, top: 90, width: 12, height: 150, display: "flex", backgroundColor: ROJO, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />

      {/* Contenido principal */}
      <div style={{ position: "absolute", left: 74, top: 56, width: 740, display: "flex", flexDirection: "column" }}>
        <img src={r.logo} width={290} height={101} alt="Cacho Cabra" />

        <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
          <div style={{ display: "flex", width: 36, height: 4, backgroundColor: ROJO, marginRight: 14 }} />
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 9, color: AMBAR }}>GIFT CARD</div>
        </div>

        {esPorcentaje ? (
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
            <div style={{ display: "flex", fontFamily: "Raleway", fontWeight: 900, fontSize: tamanoValor(textoPct, 170), lineHeight: 1, color: AMBAR }}>
              {textoPct}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24, marginBottom: 14, fontSize: 38, fontWeight: 700, letterSpacing: 5, lineHeight: 1.1 }}>
              <div style={{ display: "flex" }}>DE</div>
              <div style={{ display: "flex" }}>DESCUENTO</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 6, fontFamily: "Raleway", fontWeight: 900, fontSize: tamanoValor(textoMonto, 150), lineHeight: 1, color: AMBAR }}>
            {textoMonto}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 8, fontSize: 25, fontWeight: 500, color: TENUE }}>
          {esPorcentaje ? "aplicable a tu consumo en Cacho Cabra" : "para canjear en tu consumo en Cacho Cabra"}
        </div>

        {d.mensaje ? (
          <div style={{ display: "flex", marginTop: 24 }}>
            <div style={{ display: "flex", width: 5, backgroundColor: AMBAR, borderRadius: 3, marginRight: 18 }} />
            <div style={{ display: "flex", maxWidth: 650, maxHeight: tamanoMensaje(d.mensaje).alto, overflow: "hidden", fontSize: tamanoMensaje(d.mensaje).size, fontWeight: 500, lineHeight: 1.32, color: "#efe8e0" }}>
              {d.mensaje}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** PNG de la tarjeta, 1200×630 (el tamaño que WhatsApp espera para la vista previa de un link). */
export async function renderTarjetaPng(d: DatosTarjeta): Promise<Buffer> {
  const r = await recursos();
  // Solo las de monto llevan QR. Sin id (vista previa del formulario) se dibuja uno de muestra.
  const qr = d.tipo === "monto" ? qrSvgDataUri(urlGiftcard(d.id ?? "vista-previa")) : null;
  const res = new ImageResponse(tarjeta(d, r, qr), { width: ANCHO, height: ALTO, fonts: r.fuentes });
  return Buffer.from(await res.arrayBuffer());
}
