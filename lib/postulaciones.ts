export type EstadoPostulacion = "nueva" | "contactado" | "descartado";

export interface Postulacion {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  cv_url: string;
  estado: EstadoPostulacion;
  categoria: string | null;
  created_at: string;
}

/** Áreas a las que se puede asignar una postulación. */
export const CATEGORIAS_POSTULACION = [
  { value: "garzones", label: "Garzones" },
  { value: "coperia", label: "Coperos" },
  { value: "barra", label: "Barman" },
  { value: "cocina", label: "Cocina" },
  { value: "otro", label: "Otro" },
] as const;
