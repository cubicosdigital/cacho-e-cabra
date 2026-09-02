import { leerColeccion, reemplazarColeccion, txt, num, bool } from "./coleccion";

export interface SlideBanner {
  id: string;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  /** ID de Unsplash, URL completa o ruta a un archivo subido (/uploads/...). */
  imagen: string;
  botonTexto: string;
  botonHref: string;
  activo: boolean;
  orden: number;
}

const TABLA = "banner_slides";

function aDominio(f: Record<string, unknown>): SlideBanner {
  return {
    id: String(f.id),
    etiqueta: txt(f.etiqueta),
    titulo: txt(f.titulo),
    descripcion: txt(f.descripcion),
    imagen: txt(f.imagen),
    botonTexto: txt(f.boton_texto),
    botonHref: txt(f.boton_href),
    activo: bool(f.activo, true),
    orden: num(f.orden),
  };
}

function aFila(s: SlideBanner): Record<string, unknown> {
  return {
    id: s.id,
    etiqueta: s.etiqueta,
    titulo: s.titulo,
    descripcion: s.descripcion,
    imagen: s.imagen,
    boton_texto: s.botonTexto,
    boton_href: s.botonHref,
    activo: s.activo,
    orden: s.orden,
  };
}

export async function getSlides(): Promise<SlideBanner[]> {
  return leerColeccion(TABLA, { columna: "orden", ascendente: true }, aDominio);
}

export async function saveSlides(slides: SlideBanner[]): Promise<void> {
  await reemplazarColeccion(TABLA, slides.map(aFila));
}
