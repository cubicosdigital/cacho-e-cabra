export type EstadoPostulacion = "nueva" | "contactado" | "descartado";

export interface Postulacion {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  cv_url: string;
  estado: EstadoPostulacion;
  created_at: string;
}
