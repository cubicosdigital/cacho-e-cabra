/**
 * Texto con negritas: las palabras entre **dobles asteriscos** se muestran en negrita.
 * No interpreta HTML, así que el contenido no puede inyectar nada en la página.
 */
export function TextoRico({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*\n]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) => (p.length > 4 && p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ fontWeight: 800 }}>{p.slice(2, -2)}</strong> : p))}
    </>
  );
}

/** El mismo texto sin las marcas de negrita (para buscar o mostrar en un solo renglón). */
export function sinFormato(texto: string) {
  return texto.replace(/\*\*([^*\n]+)\*\*/g, "$1");
}
