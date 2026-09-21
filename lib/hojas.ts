import { readSheet } from "read-excel-file/node";

export type Fila = Record<string, unknown>;

/** Convierte filas (matriz) en objetos usando la primera fila como encabezados. */
function conEncabezados(matriz: unknown[][]): Fila[] {
  const [cabecera, ...resto] = matriz;
  if (!cabecera) return [];
  const nombres = cabecera.map(c => String(c ?? "").trim());
  return resto
    .filter(r => r.some(c => c != null && String(c).trim() !== ""))
    .map(r => Object.fromEntries(nombres.map((n, i) => [n, r[i] ?? null]).filter(([n]) => n)));
}

/** Lee la primera hoja de un .xlsx. */
export async function leerXlsx(buffer: Buffer): Promise<Fila[]> {
  const datos = await readSheet(buffer);
  return conEncabezados(datos as unknown[][]);
}

/** Lee un CSV separado por coma, punto y coma o tabulación, con o sin comillas. */
export function leerCsv(texto: string): Fila[] {
  const limpio = texto.replace(/^﻿/, "");
  const primera = limpio.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map(s => [s, primera.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];

  const filas: string[][] = [];
  let fila: string[] = [], celda = "", enComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (enComillas) {
      if (c === '"' && limpio[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') enComillas = false;
      else celda += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(celda); celda = ""; filas.push(fila); fila = [];
    } else celda += c;
  }
  if (celda !== "" || fila.length) { fila.push(celda); filas.push(fila); }
  return conEncabezados(filas);
}
