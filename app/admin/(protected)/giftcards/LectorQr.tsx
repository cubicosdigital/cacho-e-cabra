"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X } from "lucide-react";
import { SURFACE, SURF2, BORDER, TEXT1, TEXT3, AMR, FONT, TITLE } from "../../../../lib/tokens";

/**
 * Lector de QR con la cámara. La imagen se decodifica en el propio dispositivo (jsQR):
 * ninguna foto sale hacia ningún servidor. Entrega el texto leído; quien lo recibe
 * decide qué hacer (acá solo se extrae un id de gift card, nunca se abre como link).
 */
export default function LectorQr({ onLectura, onCodigo, onCerrar }: {
  onLectura: (texto: string) => void;
  /** Búsqueda manual por número. Devuelve un mensaje de error, o null si la encontró. */
  onCodigo: (codigo: string) => string | null;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lecturaRef = useRef(onLectura);
  const cerrarRef = useRef(onCerrar);
  const [estado, setEstado] = useState<"iniciando" | "activo" | "error">("iniciando");
  const [problema, setProblema] = useState("");
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");

  useEffect(() => { lecturaRef.current = onLectura; cerrarRef.current = onCerrar; });

  useEffect(() => {
    let detenido = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ultimo = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function iniciar() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("sin-camara-api");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (detenido) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (detenido) return;
        setEstado("activo");

        const leer = (t: number) => {
          if (detenido) return;
          // ~8 lecturas por segundo bastan y no recalientan el celular.
          if (t - ultimo > 120 && video.readyState >= 2 && video.videoWidth > 0 && ctx) {
            ultimo = t;
            const escala = Math.min(1, 800 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * escala);
            canvas.height = Math.round(video.videoHeight * escala);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (r?.data) {
              detenido = true;
              stream?.getTracks().forEach(tr => tr.stop());
              lecturaRef.current(r.data);
              return;
            }
          }
          raf = requestAnimationFrame(leer);
        };
        raf = requestAnimationFrame(leer);
      } catch (e) {
        if (detenido) return;
        const nombre = e instanceof Error ? e.name : "";
        setProblema(
          nombre === "NotAllowedError" || nombre === "SecurityError" ? "No diste permiso para usar la cámara. Actívalo en el navegador (ícono del candado, junto a la dirección) y vuelve a abrir el lector."
          : nombre === "NotFoundError" || nombre === "OverconstrainedError" ? "Este dispositivo no tiene una cámara disponible."
          : e instanceof Error && e.message === "sin-camara-api" ? "Este navegador no permite usar la cámara en esta página (requiere conexión segura, https)."
          : "No se pudo iniciar la cámara.",
        );
        setEstado("error");
      }
    }
    iniciar();

    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape") cerrarRef.current(); };
    window.addEventListener("keydown", tecla);

    return () => {
      detenido = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
      window.removeEventListener("keydown", tecla);
    };
  }, []);

  function buscarManual() {
    const err = onCodigo(codigo.trim());
    setErrorCodigo(err ?? "");
  }

  const esquina = (pos: React.CSSProperties): React.CSSProperties => ({ position: "absolute", width: 38, height: 38, borderColor: AMR, borderStyle: "solid", borderWidth: 0, ...pos });

  return (
    <div role="dialog" aria-modal="true" aria-label="Leer QR de una gift card"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14, maxHeight: "95vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: TEXT1 }}>Leer QR</div>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 6 }}><X size={24} /></button>
        </div>

        <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#000", borderRadius: 14, overflow: "hidden" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: estado === "error" ? "none" : "block" }} />
          {estado !== "error" && (
            <div style={{ position: "absolute", inset: "16%", pointerEvents: "none" }}>
              <div style={esquina({ top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 })} />
              <div style={esquina({ top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 })} />
              <div style={esquina({ bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 })} />
              <div style={esquina({ bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 })} />
            </div>
          )}
          {estado === "iniciando" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT3, fontSize: 16 }}>Iniciando cámara…</div>}
          {estado === "error" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fca5a5", fontSize: 16, padding: 20, textAlign: "center", lineHeight: 1.5 }}>{problema}</div>}
        </div>

        <div style={{ fontSize: 15, color: TEXT3, textAlign: "center" }}>
          {estado === "activo" ? "Apunta la cámara al código QR de la gift card." : estado === "error" ? "Puedes buscarla escribiendo su número." : " "}
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em" }}>¿No lee? Escribe el número</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={codigo} onChange={e => { setCodigo(e.target.value); setErrorCodigo(""); }} onKeyDown={e => { if (e.key === "Enter") buscarManual(); }}
              inputMode="numeric" placeholder="000045"
              style={{ flex: 1, minWidth: 0, background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT1, fontFamily: FONT, fontSize: 16 }} />
            <button onClick={buscarManual} disabled={!codigo.trim()}
              style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: codigo.trim() ? "pointer" : "not-allowed", opacity: codigo.trim() ? 1 : 0.5 }}>Buscar</button>
          </div>
          {errorCodigo && <div style={{ color: "#fca5a5", fontSize: 14 }}>{errorCodigo}</div>}
        </div>
      </div>
    </div>
  );
}
