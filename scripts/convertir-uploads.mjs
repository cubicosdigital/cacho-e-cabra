// Pasa a WebP liviano todo lo que haya en public/uploads, actualiza la base de datos y borra los originales.
// Uso (en el servidor): node scripts/convertir-uploads.mjs [--aplicar]   (sin --aplicar solo muestra qué haría)
import fs from "fs";
import path from "path";
import sharp from "sharp";

const APLICAR = process.argv.includes("--aplicar");
const DIR = path.join(process.cwd(), "public", "uploads");
const MAX = 250 * 1024;

const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" };
const API = env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/";

async function aWebp(buf) {
  let ancho = 1600;
  for (const q of [80, 72, 64, 56, 48, 40]) {
    const out = await sharp(buf).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: q }).toBuffer();
    if (out.byteLength <= MAX) return out;
    ancho = Math.round(ancho * 0.88);
  }
  return sharp(buf).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 35 }).toBuffer();
}

const kb = n => (n / 1024).toFixed(0) + " KB";
let antes = 0, despues = 0;

for (const f of fs.readdirSync(DIR).sort()) {
  const ext = path.extname(f).toLowerCase();
  const ruta = path.join(DIR, f);
  const tam = fs.statSync(ruta).size;

  if (ext === ".webp") {
    if (tam <= MAX) continue;
    const out = await aWebp(fs.readFileSync(ruta));
    if (out.byteLength >= tam) continue;
    console.log(`recomprime ${f}: ${kb(tam)} -> ${kb(out.byteLength)}`);
    antes += tam; despues += out.byteLength;
    if (APLICAR) fs.writeFileSync(ruta, out);
    continue;
  }
  if (![".jpg", ".jpeg", ".png"].includes(ext)) continue;

  const base = path.basename(f, ext);
  const nuevo = base + ".webp";
  const out = await aWebp(fs.readFileSync(ruta));
  console.log(`convierte ${f}: ${kb(tam)} -> ${nuevo} ${kb(out.byteLength)}`);
  antes += tam; despues += out.byteLength;
  if (!APLICAR) continue;

  fs.writeFileSync(path.join(DIR, nuevo), out);
  for (const [tabla, col] of [["productos", "foto"], ["eventos", "imagen"], ["galeria_items", "url"]]) {
    const r = await fetch(`${API}${tabla}?${col}=eq./uploads/${f}`, { method: "PATCH", headers: H, body: JSON.stringify({ [col]: `/uploads/${nuevo}` }) });
    if (!r.ok) throw new Error(`No se pudo actualizar ${tabla}: ${await r.text()}`);
  }
  fs.unlinkSync(ruta);
}
console.log(`${APLICAR ? "Listo" : "Simulación"}: ${kb(antes)} -> ${kb(despues)}`);
