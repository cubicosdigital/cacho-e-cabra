import { notFound } from "next/navigation";

// "Trabaja con nosotros" está oculto mientras se mejora el módulo de postulaciones.
// Para volver a mostrarlo, cambiar a true (y reponer los links en Header.tsx y en el home).
const PAGINA_ACTIVA = false;

export default function TrabajoLayout({ children }: { children: React.ReactNode }) {
  if (!PAGINA_ACTIVA) notFound();
  return children;
}
