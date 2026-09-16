export type TipoGaleria = "video" | "imagen";

export interface GaleriaItem {
  id: string;
  tipo: TipoGaleria;
  categoria: string;
  titulo: string;
  descripcion: string;
  /** Video: URL o ID de YouTube. Imagen: ruta /uploads/... o ID de Unsplash. */
  url: string;
  activo: boolean;
  orden: number;
}
