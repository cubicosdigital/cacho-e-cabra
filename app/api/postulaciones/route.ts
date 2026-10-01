import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSupabase } from "@/lib/supabase";
import { requirePermiso } from "@/lib/admin-auth";

const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const EXT_POR_TIPO: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Público: cualquiera puede postular desde /trabajo, sin login. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nombre = String(form.get("nombre") ?? "").trim();
  const correo = String(form.get("correo") ?? "").trim();
  const telefono = String(form.get("telefono") ?? "").trim();
  const archivo = form.get("cv");

  if (!nombre || !correo || !telefono) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Adjunta tu currículum" }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.has(archivo.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usa PDF o Word (.doc/.docx)." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 8 MB" }, { status: 400 });
  }

  const ext = EXT_POR_TIPO[archivo.type];
  const nombreArchivo = `${crypto.randomUUID()}.${ext}`;
  const destino = path.join(process.cwd(), "public", "uploads", "cv");
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));

  const { error } = await getSupabase().from("postulaciones").insert({
    nombre, correo, telefono, cv_url: `/uploads/cv/${nombreArchivo}`,
  });
  if (error) return NextResponse.json({ error: "No se pudo enviar la postulación" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Privado: la lista trae datos de contacto de quienes postularon. */
export async function GET() {
  const g = await requirePermiso("postulaciones", "r");
  if (g.error) return g.error;

  const { data, error } = await g.db.from("postulaciones").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
