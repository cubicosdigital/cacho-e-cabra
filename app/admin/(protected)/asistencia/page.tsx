"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BG, SURFACE, SURF2, BORDER, TEXT1, TEXT2, TEXT3, AMR, VERDE, ROJO, FONT, TITLE } from "../../../../lib/tokens";

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

  async function actualizarZkId(id: string, valor: string) {
    const zk_id = valor.trim() === "" ? null : parseInt(valor, 10);
    await fetch(`/api/empleados/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zk_id }),
    });
    await cargar();
  }

  const controlados = empleados.filter(e => e.control_asistencia);

  const inp: React.CSSProperties = { background: SURF2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT1, fontFamily: FONT, fontSize: 17 };

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

        {/* Mapeo zk_id */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, padding: "16px 20px 0" }}>Trabajadores y su ID en el terminal</div>
          {loading ? <div style={{ padding: 20, color: TEXT3 }}>Cargando…</div> : (
            <div>
              {empleados.map((emp, idx) => (
                <div key={emp.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 20px",
                  borderTop: idx === 0 ? "none" : `1px solid ${BORDER}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 18 }}>{emp.nombre}</span>
                      {!emp.control_asistencia && (
                        <span style={{ fontSize: 13, fontWeight: 700, background: SURF2, color: AMR, border: `1px solid ${AMR}`, borderRadius: 999, padding: "2px 10px" }}>
                          No necesita registrar
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, color: TEXT3 }}>{emp.cargo} · {emp.departamento}</div>
                  </div>
                  <label style={{ fontSize: 15, color: TEXT3 }}>ID terminal:</label>
                  <input type="number" placeholder="ej. 1" defaultValue={emp.zk_id ?? ""} style={{ ...inp, width: 80 }}
                    onBlur={e => actualizarZkId(emp.id, e.target.value)} />
                  <a href={`/admin/asistencia/${emp.id}`}
                    style={{ background: SURF2, color: TEXT2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 16, fontWeight: 700, textDecoration: "none", fontFamily: FONT }}>
                    Ver registros
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
