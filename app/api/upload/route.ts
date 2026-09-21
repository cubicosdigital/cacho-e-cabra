import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";

const MAX_BYTES_ENTRADA = 25 * 1024 * 1024;
const MAX_BYTES_SALIDA = 400 * 1024;
const ANCHO_MAX = 1920;

const TIPOS_PERMITIDOS = new Set([
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
]);

/** Convierte a WebP, la redimensiona si es muy ancha y baja la calidad hasta que pese <400KB. */
async function procesarImagen(buffer: Buffer): Promise<Buffer> {
  let ancho = ANCHO_MAX;
  for (let intento = 0; intento < 6; intento++) {
    const calidad = [82, 75, 68, 60, 52, 45][intento];
    const salida = await sharp(buffer)
      .rotate() // respeta la orientación EXIF antes de achicar
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: calidad })
      .toBuffer();
    if (salida.byteLength <= MAX_BYTES_SALIDA) return salida;
    ancho = Math.round(ancho * 0.85); // si ni con la calidad más baja entra, además achicamos el ancho
  }
  // último intento, lo que salga (calidad mínima + más achicado)
  return sharp(buffer).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 40 }).toBuffer();
}

export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const archivo = form.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.has(archivo.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG, WebP, AVIF o GIF." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES_ENTRADA) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 25 MB" }, { status: 400 });
  }

  let procesado: Buffer;
  try {
    procesado = await procesarImagen(Buffer.from(await archivo.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la imagen" }, { status: 500 });
  }

  // El nombre lo generamos nosotros: nunca se usa el que viene del cliente.
  const nombre = `${crypto.randomUUID()}.webp`;
  const destino = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, nombre), procesado);

  return NextResponse.json({ url: `/uploads/${nombre}` });
}
