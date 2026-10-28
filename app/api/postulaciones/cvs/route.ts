import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requirePermiso } from "@/lib/admin-auth";

const ascii = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "");

/**
 * Privado: junta los currículums en PDF en un solo archivo (una portada por postulante con su nombre y contacto).
 * ?categoria=<valor> | sin  limita la selección, igual que el filtro de la pantalla.
 * Los currículums en Word no se pueden unir: se omiten y se avisa en el encabezado X-Omitidos.
 */
export async function GET(req: NextRequest) {
  const g = await requirePermiso("postulaciones", "r");
  if (g.error) return g.error;

  const categoria = req.nextUrl.searchParams.get("categoria");
  let q = g.db.from("postulaciones").select("nombre, correo, telefono, cv_url, categoria").order("created_at", { ascending: false });
  if (categoria === "sin") q = q.is("categoria", null);
  else if (categoria && categoria !== "todas") q = q.eq("categoria", categoria);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const salida = await PDFDocument.create();
  const fuente = await salida.embedFont(StandardFonts.HelveticaBold);
  const normal = await salida.embedFont(StandardFonts.Helvetica);
  const omitidos: string[] = [];
  let unidos = 0;
  const raiz = path.join(process.cwd(), "public", "uploads", "cv");

  for (const p of data ?? []) {
    const archivo = path.basename(p.cv_url);
    if (!archivo.toLowerCase().endsWith(".pdf")) { omitidos.push(p.nombre); continue; }
    try {
      const fuentePdf = await PDFDocument.load(await fs.readFile(path.join(raiz, archivo)), { ignoreEncryption: true });
      const portada = salida.addPage([595, 842]);
      portada.drawText(ascii(p.nombre) || "Postulante", { x: 50, y: 760, size: 26, font: fuente, color: rgb(0.1, 0.1, 0.1) });
      portada.drawText(ascii(`${p.correo}  |  ${p.telefono}`), { x: 50, y: 730, size: 13, font: normal, color: rgb(0.3, 0.3, 0.3) });
      const paginas = await salida.copyPages(fuentePdf, fuentePdf.getPageIndices());
      paginas.forEach(pg => salida.addPage(pg));
      unidos++;
    } catch { omitidos.push(p.nombre); }
  }

  if (unidos === 0) return NextResponse.json({ error: "No hay currículums en PDF para unir." }, { status: 404 });

  return new NextResponse(Buffer.from(await salida.save()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="curriculums.pdf"`,
      "Cache-Control": "no-store",
      "X-Unidos": String(unidos),
      "X-Omitidos": encodeURIComponent(omitidos.join(", ")),
    },
  });
}
