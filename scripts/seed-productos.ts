/**
 * Corre una sola vez después de crear el proyecto Supabase y aplicar supabase/schema.sql:
 *   npx tsx scripts/seed-productos.ts
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY en .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import ws from "ws";
import { PRODUCTOS_SEED } from "../lib/data/productos-seed";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}

// Node 20 no trae WebSocket nativo — el cliente de Supabase lo necesita para su realtime client interno.
const supabase = createClient(url, serviceKey, { realtime: { transport: ws as never } });

async function main() {
  const rows = PRODUCTOS_SEED.map((p, i) => ({
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    categoria: p.categoria,
    foto: p.foto,
    badge: p.badge ?? null,
    popular: p.popular ?? false,
    disponible: true,
    orden: i,
  }));

  const { error, count } = await supabase.from("productos").insert(rows, { count: "exact" });

  if (error) {
    console.error("Error insertando productos:", error.message);
    process.exit(1);
  }

  console.log(`✓ ${count ?? rows.length} productos insertados en Supabase.`);
}

main();
