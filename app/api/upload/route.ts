import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { supabaseServer } from "@/lib/supabase-server";

const MAX_BYTES = 6 * 1024 * 1024;

/** Solo estos formatos, y la extensión la decidimos nosotros a partir del tipo real. */
const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const archivo = form.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }
  const ext = TIPOS[archivo.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG, WebP o AVIF." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 6 MB" }, { status: 400 });
  }

  // El nombre lo generamos nosotros: nunca se usa el que viene del cliente.
  const nombre = `${crypto.randomUUID()}.${ext}`;
  const destino = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, nombre), Buffer.from(await archivo.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${nombre}` });
}
