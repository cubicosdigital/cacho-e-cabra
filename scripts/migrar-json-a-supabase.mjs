/**
 * Sube a Postgres lo que quedó en data/*.json.
 *
 * De los cinco archivos sólo eventos.json tiene datos (9 eventos); el resto
 * están vacíos, así que en la práctica esto migra los eventos y confirma que
 * las demás tablas quedaron creadas.
 *
 * Requiere que ya se haya corrido supabase/migrations/002_migrar_json_a_postgres.sql.
 *
 *   node scripts/migrar-json-a-supabase.mjs
 */
import { readFileSync, existsSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trimStart().startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_KEY;

if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}

const cabeceras = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function existeTabla(tabla) {
  const r = await fetch(`${URL}/rest/v1/${tabla}?select=id&limit=1`, { headers: cabeceras });
  return r.ok;
}

async function insertar(tabla, filas) {
  const r = await fetch(`${URL}/rest/v1/${tabla}`, {
    method: "POST",
    headers: { ...cabeceras, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(filas),
  });
  if (!r.ok) throw new Error(`${tabla}: ${r.status} ${await r.text()}`);
}

function leerJson(ruta) {
  if (!existsSync(ruta)) return [];
  const d = JSON.parse(readFileSync(ruta, "utf8"));
  if (Array.isArray(d)) return d;
  return Array.isArray(Object.values(d)[0]) ? Object.values(d)[0] : [];
}

// ─── Comprobar que las tablas existan ──────────────────────────────
const TABLAS = ["eventos", "evento_registros", "presupuestos", "banner_slides", "delivery_pedidos", "clientes"];
const faltantes = [];
for (const t of TABLAS) if (!(await existeTabla(t))) faltantes.push(t);

if (faltantes.length) {
  console.error("❌ Faltan tablas por crear:", faltantes.join(", "));
  console.error("   Corre primero supabase/migrations/002_migrar_json_a_postgres.sql en el SQL Editor.");
  process.exit(1);
}
console.log("✅ Las 6 tablas existen\n");

// ─── eventos ───────────────────────────────────────────────────────
const eventos = leerJson("data/eventos.json");
if (eventos.length) {
  await insertar(
    "eventos",
    eventos.map(e => ({
      id: String(e.id),
      titulo: e.titulo,
      tipo: e.tipo ?? "fiesta",
      fecha: e.fecha ?? "",
      fecha_corta: e.fechaCorta ?? "",
      mes: e.mes ?? "",
      hora: e.hora ?? "20:00",
      duracion: e.duracion ?? "",
      precio: Number(e.precio) || 0,
      cupos: Number(e.cupos) || 0,
      registrados: Number(e.registrados) || 0,
      emoji: e.emoji ?? "🎉",
      subtitulo: e.subtitulo ?? "",
      descripcion: e.descripcion ?? "",
      detalles: e.detalles ?? [],
      imagen: e.imagen ?? "",
      estado: e.estado ?? "abierto",
      destacado: !!e.destacado,
      publicado: !!e.publicado,
      orden: Number(e.orden) || 0,
      chef: e.chef ?? null,
      promo: e.promo ?? null,
      lugar: e.lugar ?? null,
      gastronomia: e.gastronomia ?? null,
      experiencia: e.experiencia ?? null,
    })),
  );
  console.log(`✅ eventos: ${eventos.length} migrados`);
} else {
  console.log("·  eventos: nada que migrar");
}

// ─── el resto (vacíos hoy, pero por si acaso) ──────────────────────
const registros = leerJson("data/evento_registros.json");
if (registros.length) {
  await insertar(
    "evento_registros",
    registros.map(r => ({
      nombre: r.nombre,
      email: r.email,
      telefono: r.telefono,
      personas: Number(r.personas) || 1,
      evento_id: String(r.evento_id),
      fecha_registro: r.fecha_registro ?? new Date().toISOString(),
      confirmado: !!r.confirmado,
      pagado: !!r.pagado,
    })),
  );
  console.log(`✅ evento_registros: ${registros.length} migrados`);
} else {
  console.log("·  evento_registros: vacío");
}

for (const [archivo, tabla, mapear] of [
  ["data/presupuestos.json", "presupuestos", p => ({
    id: p.id, referencia: p.referencia ?? "", cliente: p.cliente ?? "",
    telefono: p.telefono ?? "", email: p.email ?? "",
    precio_por_persona: Number(p.precioPorPersona) || 0,
    personas: Number(p.personas) || 0, intro: p.intro ?? "",
    bloques: p.bloques ?? [], notas: p.notas ?? "",
    estado: p.estado ?? "borrador", creado_en: p.creadoEn ?? new Date().toISOString(),
  })],
  ["data/banner.json", "banner_slides", s => ({
    id: s.id, etiqueta: s.etiqueta ?? "", titulo: s.titulo ?? "",
    descripcion: s.descripcion ?? "", imagen: s.imagen ?? "",
    boton_texto: s.botonTexto ?? "", boton_href: s.botonHref ?? "",
    activo: s.activo !== false, orden: Number(s.orden) || 0,
  })],
  ["data/delivery.json", "delivery_pedidos", d => ({
    id: d.id, cliente: d.cliente ?? "", telefono: d.telefono ?? "",
    direccion: d.direccion ?? "", referencia: d.referencia ?? "",
    items: d.items ?? [], despacho: Number(d.despacho) || 0,
    notas: d.notas ?? "", repartidor: d.repartidor ?? "",
    estado: d.estado ?? "recibido", total: Number(d.total) || 0,
    created_at: d.created_at ?? new Date().toISOString(),
  })],
]) {
  const filas = leerJson(archivo);
  if (filas.length) {
    await insertar(tabla, filas.map(mapear));
    console.log(`✅ ${tabla}: ${filas.length} migrados`);
  } else {
    console.log(`·  ${tabla}: vacío`);
  }
}

console.log("\nListo. Ya se puede borrar data/.");
