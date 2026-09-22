"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../lib/tokens";

interface Empleado {
  id: string; nombre: string; cargo: string | null; departamento: string;
  control_asistencia: boolean; zk_id: number | null; activo: boolean;
}
export default function AsistenciaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const inputFile = useRef<HTMLInputElement>(null);

  async function cargar() {
    const eRes = await fetch("/api/empleados");
    if (eRes.ok) setEmpleados(await eRes.json());
    setLoading(false);
  }

  useEffect(() => { (async () => { await cargar(); })(); }, []);

  async function subirArchivo(file: File) {
    setSubiendo(true);
    setResultado(null);
    const form = new FormData();
    form.append("archivo", file);
    const res = await fetch("/api/asistencia/importar", { method: "POST", body: form });
    const data = await res.json();
    setSubiendo(false);
    if (res.ok) {
      setResultado({ ok: true, texto: `Importados ${data.importados} registros de ${data.total_filas} filas.` +
        (data.ids_sin_mapear?.length ? ` IDs sin mapear a ningún empleado: ${data.ids_sin_mapear.join(", ")}.` : "") });
      await cargar();
    } else {
      setResultado({ ok: false, texto: data.error + (data.sinMapear?.length ? ` (IDs: ${data.sinMapear.join(", ")})` : "") });
    }
    if (inputFile.current) inputFile.current.value = "";
  }

  const controlados = empleados.filter(e => e.control_asistencia);
  void loading;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: TITLE, fontSize: 32, fontWeight: 900 }}>Asistencia</div>
            <div style={{ fontSize: 17, color: TEXT3 }}>{controlados.length} trabajadores con control de asistencia</div>
          </div>
          <Link href="/admin/asistencia/registros"
            style={{ background: AMR, color: "#1a1200", borderRadius: 10, padding: "12px 24px", fontSize: 18, fontWeight: 800, textDecoration: "none", fontFamily: FONT }}>
            Ver registros generales →
          </Link>
        </div>

        {/* Importar */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Importar desde el terminal ZK</div>
          <div style={{ fontSize: 16, color: TEXT3, marginBottom: 14 }}>
            Sube el Excel/CSV exportado del terminal (vía USB o software ZKTeco). Se cruza por el ID del terminal (columna &quot;zk_id&quot; abajo).
          </div>
          <input ref={inputFile} type="file" accept=".xlsx,.csv,.txt,.dat" disabled={subiendo} hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }} />
          <button onClick={() => inputFile.current?.click()} disabled={subiendo}
            style={{ background: AMR, color: "#1a1200", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            {subiendo ? "Importando…" : "Subir archivo CSV / Excel"}
          </button>
          {subiendo && <div style={{ color: TEXT3, marginTop: 10 }}>Importando…</div>}
          {resultado && (
            <div style={{ marginTop: 10, color: resultado.ok ? VERDE : ROJO, fontSize: 16 }}>{resultado.texto}</div>
          )}
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 16, color: TEXT3 }}>Para ver la asistencia de una persona o asignarle su ID en el terminal, entra a su ficha.</div>
          <Link href="/admin/trabajadores"
            style={{ background: SURF2, color: TEXT1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 20px", fontSize: 16, fontWeight: 700, textDecoration: "none", fontFamily: FONT }}>
            Ir a Trabajadores →
          </Link>
        </div>
      </div>
    </div>
  );
}
