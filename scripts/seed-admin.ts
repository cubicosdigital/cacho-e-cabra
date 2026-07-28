/**
 * Crea el primer usuario administrador (Supabase Auth + fila en usuarios_admin).
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY,
 * SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NOMBRE (opcional).
 * No dejes esas dos últimas variables commiteadas — bórralas de .env.local después de correr esto.
 *   npx tsx scripts/seed-admin.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const nombre = process.env.SEED_ADMIN_NOMBRE || email?.split("@")[0] || "Admin";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { realtime: { transport: ws as never } });

async function main() {
  const { data: authUser, error: errAuth } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (errAuth) { console.error("Error creando usuario en Auth:", errAuth.message); process.exit(1); }

  const { error: errRow } = await supabase.from("usuarios_admin").insert({
    email, nombre, rol: "admin", activo: true,
  });
  if (errRow) { console.error("Error creando fila en usuarios_admin:", errRow.message); process.exit(1); }

  console.log(`✓ Usuario admin creado: ${email} (id: ${authUser.user.id})`);
}

main();
