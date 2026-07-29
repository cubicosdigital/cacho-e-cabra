import { notFound } from "next/navigation";
import Image from "next/image";
import { getPresupuesto, fmtPeso } from "../../../lib/presupuestos";

// Se edita desde el CMS, así que no se puede cachear.
export const dynamic = "force-dynamic";

const VINO = "#9B1B30";
const TINTA = "#4a4a4a";
const TINTA2 = "#6b6b6b";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPresupuesto(id);
  return { title: p ? `Presupuesto ${p.cliente} · Cacho Cabra` : "Presupuesto · Cacho Cabra" };
}

export default async function PresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPresupuesto(id);
  if (!p) notFound();

  const total = p.personas > 0 ? p.precioPorPersona * p.personas : 0;

  return (
    <div style={{ background: "#e8e6e2", minHeight: "100vh", padding: "32px 16px" }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print, header { display: none !important; }
          .hoja { box-shadow: none !important; margin: 0 !important; padding: 40px !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 16px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Presupuesto Cacho Cabra para ${p.cliente}`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ background: "#25D366", color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-dm), sans-serif" }}
        >
          Compartir por WhatsApp
        </a>
      </div>

      <div
        className="hoja"
        style={{
          maxWidth: 820, margin: "0 auto", background: "#fff", borderRadius: 4,
          padding: "56px 64px 72px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          fontFamily: "var(--font-dm), sans-serif", color: TINTA,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Image src="/logo-2026-02.png" alt="Cacho Cabra" width={216} height={76} style={{ height: "auto", display: "inline-block" }} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 18, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 40, fontWeight: 900, color: VINO, margin: 0 }}>
            Presupuesto
          </h1>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 38, fontWeight: 900, color: VINO, lineHeight: 1 }}>
              {fmtPeso(p.precioPorPersona)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: VINO, letterSpacing: "0.02em" }}>por persona</div>
          </div>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.75, color: TINTA, marginBottom: 40, maxWidth: 640 }}>
          {p.intro}
        </p>

        {p.bloques.map((bloque, bi) => (
          <section key={bi} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 30, fontWeight: 900, color: VINO, marginBottom: 20 }}>
              {bloque.titulo}
            </h2>
            {bloque.grupos.map((grupo, gi) => (
              <div key={gi} style={{ marginBottom: 20 }}>
                {grupo.subtitulo && (
                  <div style={{ fontSize: 16, fontWeight: 800, color: TINTA, marginBottom: 6 }}>{grupo.subtitulo}</div>
                )}
                {grupo.lineas.map((linea, li) => (
                  <div key={li} style={{ fontSize: 16, color: TINTA2, lineHeight: 1.7 }}>{linea}</div>
                ))}
              </div>
            ))}
          </section>
        ))}

        {(p.personas > 0 || p.notas) && (
          <section style={{ borderTop: "1px solid #ddd", paddingTop: 24, marginBottom: 32 }}>
            {p.personas > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, marginBottom: 8 }}>
                <span style={{ color: TINTA }}>{p.personas} personas × {fmtPeso(p.precioPorPersona)}</span>
                <strong style={{ color: VINO, fontSize: 20 }}>{fmtPeso(total)}</strong>
              </div>
            )}
            {p.notas && (
              <p style={{ fontSize: 14, color: TINTA2, lineHeight: 1.7, marginTop: 12, whiteSpace: "pre-line" }}>{p.notas}</p>
            )}
          </section>
        )}

        <div style={{ textAlign: "right", marginTop: 48 }}>
          <div style={{ fontFamily: "var(--font-raleway), sans-serif", fontSize: 30, color: TINTA2, fontStyle: "italic" }}>
            Cacho Cabra
          </div>
          {(p.telefono || p.email) && (
            <div style={{ fontSize: 13, color: TINTA2, marginTop: 6 }}>
              {[p.telefono, p.email].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
