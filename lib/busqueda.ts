/** Sin tildes/mayúsculas, para comparar sin que "sandía" y "sandia" cuenten distinto. */
function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * ¿El texto contiene todas las palabras de la búsqueda, en cualquier orden?
 * Así "jugo sandia" encuentra "Jugo de Sandía" aunque "de" quede en el medio.
 */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const q = normalizar(consulta).trim();
  if (!q) return true;
  const t = normalizar(texto);
  return q.split(/\s+/).every(palabra => t.includes(palabra));
}
