import type { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Recursos compartidos por todo lo que se dibuja en el servidor con Satori
// (gift cards, gráficas de redes, menú del día): fuentes, logo y paleta.
// Se leen una sola vez.

export const AMBAR = "#FBBF24";
export const ROJO = "#c4262e";
export const TEXTO = "#f5f2ee";
export const TENUE = "#b0a89f";
export const FONDO_CLARO = "#2d2b27";
export const FONDO_OSCURO = "#1b1917";

export type Fuentes = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;
export interface Recursos { fuentes: Fuentes; logo: string; cachos: string }

let cache: Promise<Recursos> | null = null;

async function cargar(): Promise<Recursos> {
  const raiz = process.cwd();
  const [raleway, dm500, dm700, pacifico, logo, cachos] = await Promise.all([
    readFile(join(raiz, "assets/fonts/raleway-latin-900-normal.woff")),
    readFile(join(raiz, "assets/fonts/dm-sans-latin-500-normal.woff")),
    readFile(join(raiz, "assets/fonts/dm-sans-latin-700-normal.woff")),
    readFile(join(raiz, "assets/fonts/pacifico-latin-400-normal.woff")),
    readFile(join(raiz, "public/LogoCachoEcabra-white.png")),
    readFile(join(raiz, "public/giftcard-cachos.png")),
  ]);
  return {
    fuentes: [
      { name: "Raleway", data: raleway, weight: 900, style: "normal" },
      { name: "DM Sans", data: dm500, weight: 500, style: "normal" },
      { name: "DM Sans", data: dm700, weight: 700, style: "normal" },
      { name: "Pacifico", data: pacifico, weight: 400, style: "normal" },
    ],
    logo: `data:image/png;base64,${logo.toString("base64")}`,
    cachos: `data:image/png;base64,${cachos.toString("base64")}`,
  };
}

/** Los recursos no cambian entre peticiones: se leen una vez. Si falla, se reintenta en la siguiente. */
export function recursos(): Promise<Recursos> {
  if (!cache) cache = cargar().catch(e => { cache = null; throw e; });
  return cache;
}

/** Copo de nieve de líneas finas. Va como imagen SVG (Satori la dibuja sin problema y no pesa nada). */
export function copoUri(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 2v20M3.34 7l17.32 10M3.34 17L20.66 7"/>` +
    `<path d="M9.6 3.6 12 6l2.4-2.4M9.6 20.4 12 18l2.4 2.4M4.6 9.4l3.3.5-.6-3.3M19.4 14.6l-3.3-.5.6 3.3M4.6 14.6l3.3-.5-.6 3.3M19.4 9.4l-3.3.5.6-3.3"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const aUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Bola de Navidad con brillo, lista para colgar (el casquillo dorado queda arriba). */
export function bolaUri(color: string, claro: string): string {
  return aUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><defs><radialGradient id="g" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${color}"/></radialGradient></defs>` +
      `<rect x="15" y="0" width="10" height="8" rx="1.5" fill="#d4a017"/><rect x="17.5" y="0" width="5" height="3" fill="#f3d36b"/>` +
      `<circle cx="20" cy="38" r="18" fill="url(#g)"/><ellipse cx="13.5" cy="30" rx="3.8" ry="6" fill="#fff" opacity=".38" transform="rotate(28 13.5 30)"/></svg>`,
  );
}

/** Estrella de cinco puntas dorada. */
export function estrellaUri(color = AMBAR): string {
  return aUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M12 1.5l3 7 7.5.6-5.7 4.9 1.8 7.4L12 17.4 5.4 21.4l1.8-7.4L1.5 9.1 9 8.5z"/></svg>`,
  );
}

/** Ramita de acebo: dos hojas verdes y tres bayas rojas. */
export function aceboUri(): string {
  const hoja = "M0 13 6 6 10 9 16 2 22 6 28 0 36 5 44 3 52 9 60 13 52 17 44 23 36 21 28 26 22 20 16 24 10 17 6 20Z";
  return aUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 84">` +
      `<g transform="translate(60 46) rotate(-28) translate(-8 -13)"><path d="${hoja}" fill="#2f7a4d"/><path d="M4 13H56" stroke="#5fb583" stroke-width="1.6"/></g>` +
      `<g transform="translate(60 46) rotate(208) translate(-8 -13)"><path d="${hoja}" fill="#256a40"/><path d="M4 13H56" stroke="#5fb583" stroke-width="1.6"/></g>` +
      `<circle cx="52" cy="42" r="7.5" fill="#c4262e"/><circle cx="66" cy="44" r="7.5" fill="#d93a42"/><circle cx="58" cy="54" r="7.5" fill="#b11f27"/>` +
      `<circle cx="50" cy="39.5" r="2" fill="#fff" opacity=".55"/><circle cx="64" cy="41.5" r="2" fill="#fff" opacity=".55"/>` +
      `</svg>`,
  );
}

/** PNG → JPG de alta calidad, el formato que se descarga para subir a Instagram. */
export async function pngAJpg(png: Buffer, calidad = 92): Promise<Buffer> {
  return sharp(png).flatten({ background: FONDO_OSCURO }).jpeg({ quality: calidad, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
}
