import sharp from "sharp";

// PDFs hechos a mano: así no hace falta sumar una librería de PDF solo para esto.
// Las tarjetas van como imágenes JPEG; el texto (solo ASCII) usa la fuente Helvetica
// estándar de todo lector de PDF.

/** Los textos de un PDF van entre paréntesis: se escapan y se dejan en ASCII. */
function textoSeguro(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1");
}

class Pdf {
  private partes: Buffer[] = [];
  private offsets = new Map<number, number>();
  private pos = 0;
  private siguiente = 1;

  constructor() {
    this.escribir("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  }

  private escribir(b: Buffer | string) {
    const buf = typeof b === "string" ? Buffer.from(b, "latin1") : b;
    this.partes.push(buf);
    this.pos += buf.length;
  }

  /** Reserva un número de objeto (se puede escribir después, en cualquier orden). */
  numero(): number {
    return this.siguiente++;
  }

  objeto(n: number, cuerpo: string, stream?: Buffer) {
    this.offsets.set(n, this.pos);
    this.escribir(`${n} 0 obj\n${cuerpo}`);
    if (stream) {
      this.escribir("\nstream\n");
      this.escribir(stream);
      this.escribir("\nendstream");
    }
    this.escribir("\nendobj\n");
  }

  cerrar(raiz: number, info: number): Buffer {
    const total = this.siguiente;
    const inicioXref = this.pos;
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let n = 1; n < total; n++) xref += `${String(this.offsets.get(n) ?? 0).padStart(10, "0")} 00000 n \n`;
    this.escribir(xref);
    this.escribir(`trailer\n<< /Size ${total} /Root ${raiz} 0 R /Info ${info} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
    return Buffer.concat(this.partes);
  }
}

async function aJpeg(png: Buffer, anchoMax?: number) {
  let img = sharp(png);
  if (anchoMax) img = img.resize({ width: anchoMax, withoutEnlargement: true });
  return img.flatten({ background: "#1b1917" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true });
}

function objetoImagen(pdf: Pdf, n: number, jpg: Buffer, ancho: number, alto: number) {
  pdf.objeto(n, `<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
}

/**
 * PDF de una página con UNA tarjeta a página completa. Mide 600 pt de ancho (≈ 21 cm),
 * un buen tamaño para verla en el celular o imprimirla.
 */
export async function pngAPdf(png: Buffer, titulo: string): Promise<Buffer> {
  const { data: jpg, info } = await aJpeg(png);
  const ancho = 600;
  const alto = Math.round((ancho * info.height) / info.width);
  const contenido = Buffer.from(`q ${ancho} 0 0 ${alto} 0 0 cm /Im0 Do Q`, "latin1");

  const pdf = new Pdf();
  const [catalogo, paginas, pagina, imagen, flujo, meta] = [pdf.numero(), pdf.numero(), pdf.numero(), pdf.numero(), pdf.numero(), pdf.numero()];
  pdf.objeto(catalogo, `<< /Type /Catalog /Pages ${paginas} 0 R >>`);
  pdf.objeto(paginas, `<< /Type /Pages /Kids [${pagina} 0 R] /Count 1 >>`);
  pdf.objeto(pagina, `<< /Type /Page /Parent ${paginas} 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /XObject << /Im0 ${imagen} 0 R >> >> /Contents ${flujo} 0 R >>`);
  objetoImagen(pdf, imagen, jpg, info.width, info.height);
  pdf.objeto(flujo, `<< /Length ${contenido.length} >>`, contenido);
  pdf.objeto(meta, `<< /Title (${textoSeguro(titulo)}) /Producer (Cacho Cabra) >>`);
  return pdf.cerrar(catalogo, meta);
}

// Hoja A4 vertical para imprimir y recortar: 2 columnas × 5 filas = 10 tarjetas por hoja.
const A4 = { ancho: 595, alto: 842 };
const COLUMNAS = 2;
const FILAS = 5;
const ANCHO_TARJETA = 262;
const SEPARACION_X = 14;
const SEPARACION_Y = 10;

/** Cuántas tarjetas caben por hoja. */
export const TARJETAS_POR_HOJA = COLUMNAS * FILAS;

/**
 * PDF con todas las tarjetas de un lote, en el orden recibido (el correlativo), 10 por hoja,
 * cada una con un borde fino de guía para recortar y un pie con el rango de números.
 */
export async function hojaDeTarjetasPdf(pngs: Buffer[], titulo: string): Promise<Buffer> {
  if (pngs.length === 0) throw new Error("No hay tarjetas para armar el PDF");

  // 1000 px de ancho bastan para una tarjeta de ~9 cm impresa (≈ 280 ppp) y mantienen el PDF liviano.
  const jpegs = [];
  for (const png of pngs) jpegs.push(await aJpeg(png, 1000));

  const proporcion = jpegs[0].info.height / jpegs[0].info.width;
  const altoTarjeta = ANCHO_TARJETA * proporcion;
  const anchoGrilla = COLUMNAS * ANCHO_TARJETA + (COLUMNAS - 1) * SEPARACION_X;
  const altoGrilla = FILAS * altoTarjeta + (FILAS - 1) * SEPARACION_Y;
  const margenX = (A4.ancho - anchoGrilla) / 2;
  const margenSuperior = (A4.alto - altoGrilla) / 2 + 6;
  const hojas = Math.ceil(jpegs.length / TARJETAS_POR_HOJA);
  const f = (n: number) => n.toFixed(2);

  const pdf = new Pdf();
  const catalogo = pdf.numero();
  const paginas = pdf.numero();
  const meta = pdf.numero();
  const fuente = pdf.numero();
  const objImagen = jpegs.map(() => pdf.numero());
  const objPagina = Array.from({ length: hojas }, () => pdf.numero());
  const objFlujo = Array.from({ length: hojas }, () => pdf.numero());

  pdf.objeto(catalogo, `<< /Type /Catalog /Pages ${paginas} 0 R >>`);
  pdf.objeto(paginas, `<< /Type /Pages /Kids [${objPagina.map(n => `${n} 0 R`).join(" ")}] /Count ${hojas} >>`);
  pdf.objeto(meta, `<< /Title (${textoSeguro(titulo)}) /Producer (Cacho Cabra) >>`);
  pdf.objeto(fuente, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  jpegs.forEach((j, i) => objetoImagen(pdf, objImagen[i], j.data, j.info.width, j.info.height));

  for (let h = 0; h < hojas; h++) {
    const desde = h * TARJETAS_POR_HOJA;
    const enHoja = jpegs.slice(desde, desde + TARJETAS_POR_HOJA);

    let cs = "";
    enHoja.forEach((_, k) => {
      const col = k % COLUMNAS;
      const fila = Math.floor(k / COLUMNAS);
      const x = margenX + col * (ANCHO_TARJETA + SEPARACION_X);
      const y = A4.alto - margenSuperior - (fila + 1) * altoTarjeta - fila * SEPARACION_Y;
      cs += `q ${f(ANCHO_TARJETA)} 0 0 ${f(altoTarjeta)} ${f(x)} ${f(y)} cm /Im${k} Do Q\n`;
      cs += `q 0.6 G 0.4 w ${f(x)} ${f(y)} ${f(ANCHO_TARJETA)} ${f(altoTarjeta)} re S Q\n`;
    });
    cs += `BT /F1 8 Tf 0.45 g ${f(margenX)} 26 Td (${textoSeguro(titulo)} - Hoja ${h + 1} de ${hojas}) Tj ET\n`;
    const flujo = Buffer.from(cs, "latin1");

    const xobjects = enHoja.map((_, k) => `/Im${k} ${objImagen[desde + k]} 0 R`).join(" ");
    pdf.objeto(objPagina[h], `<< /Type /Page /Parent ${paginas} 0 R /MediaBox [0 0 ${A4.ancho} ${A4.alto}] /Resources << /XObject << ${xobjects} >> /Font << /F1 ${fuente} 0 R >> >> /Contents ${objFlujo[h]} 0 R >>`);
    pdf.objeto(objFlujo[h], `<< /Length ${flujo.length} >>`, flujo);
  }

  return pdf.cerrar(catalogo, meta);
}
