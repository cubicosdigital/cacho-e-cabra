/**
 * Las fotos pueden venir de tres lados: un ID de Unsplash (lo histórico),
 * una URL completa, o un archivo subido al CMS que vive en /uploads.
 */
export function resolverImagen(foto: string, ancho = 1400, alto = 900) {
  if (!foto) return "";
  if (foto.startsWith("http://") || foto.startsWith("https://")) return foto;
  if (foto.startsWith("/")) return foto;
  return `https://images.unsplash.com/${foto}?auto=format&fit=crop&w=${ancho}&h=${alto}&q=85`;
}
