import QRCode from "qrcode";

/**
 * QR como imagen SVG (data URI). Al ser vectorial se ve nítido a cualquier tamaño,
 * en pantalla y en el PDF impreso; una imagen PNG se pixelaría al escalarla.
 *
 * Módulos oscuros sobre fondo blanco, con zona de silencio incluida: así lo leen
 * todos los lectores (un QR invertido o sin margen falla en muchos).
 */
export function qrSvgDataUri(texto: string, opciones: { margen?: number; oscuro?: string } = {}): string {
  const margen = opciones.margen ?? 2;
  const oscuro = opciones.oscuro ?? "#1b1917";
  const qr = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const total = n + margen * 2;

  let trazo = "";
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(fila, col)) trazo += `M${col + margen} ${fila + margen}h1v1h-1z`;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/><path d="${trazo}" fill="${oscuro}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
