"use client";
import { useRef, useState } from "react";
import { resolverImagen } from "../../../lib/imagenes";
import { SURF2, BORDER, TEXT1, TEXT3, FONT } from "../../../lib/tokens";

/**
 * Deja cambiar la foto de un producto: subiendo un archivo o pegando
 * un ID de Unsplash / una URL. Devuelve el valor listo para guardar.
 */
export default function SelectorFoto({
  valor,
  onChange,
  alto = 90,
}: {
  valor: string;
  onChange: (foto: string) => void;
  alto?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    setError(null);
    setSubiendo(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setSubiendo(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "No se pudo subir la imagen");
      return;
    }
    const { url } = await res.json();
    onChange(url);
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{
        width: alto * 1.5, height: alto, flexShrink: 0, borderRadius: 8, overflow: "hidden",
        background: SURF2, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolverImagen(valor, 300, 200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: TEXT3, fontSize: 13 }}>Sin foto</span>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }}
        />
        <button type="button" onClick={() => input.current?.click()} disabled={subiendo} style={{
          background: SURF2, border: `1px solid ${BORDER}`, color: TEXT1, borderRadius: 8,
          padding: "8px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
        }}>
          {subiendo ? "Subiendo…" : valor ? "Cambiar foto" : "Subir foto"}
        </button>
        <input
          value={valor} onChange={e => onChange(e.target.value)}
          placeholder="…o pega un ID de Unsplash / URL"
          style={{ background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 10px", color: TEXT1, fontFamily: FONT, fontSize: 14 }}
        />
        {error && <div style={{ fontSize: 13, color: "#fca5a5" }}>{error}</div>}
      </div>
    </div>
  );
}
