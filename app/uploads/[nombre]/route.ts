import { promises as fs } from "fs";
import path from "path";

const TIPOS: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

// Next en producción solo sirve lo que había en /public al compilar: las fotos subidas después daban 404
// hasta el siguiente deploy. Esta ruta las lee del disco en el momento.
export async function GET(_req: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  const m = /^[\w-]+\.(webp|jpe?g|png)$/i.exec(nombre);
  if (!m) return new Response("No encontrado", { status: 404 });

  try {
    const datos = await fs.readFile(path.join(process.cwd(), "public", "uploads", nombre));
    return new Response(new Uint8Array(datos), {
      headers: {
        "Content-Type": TIPOS[m[1].toLowerCase()],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
