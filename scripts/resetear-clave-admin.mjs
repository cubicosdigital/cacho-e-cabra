/**
 * Genera una contraseña nueva para un usuario del panel y la imprime en ESTA
 * terminal. La clave no sale de tu máquina: se genera local, se manda a
 * Supabase Auth y se muestra una sola vez acá.
 *
 *   node scripts/resetear-clave-admin.mjs                      # hola@cubicosdigital.cl
 *   node scripts/resetear-clave-admin.mjs otro@correo.cl       # otro usuario
 *   node scripts/resetear-clave-admin.mjs otro@correo.cl --crear  # lo crea si no existe
 *
 * Después de entrar, cámbiala desde Supabase si va a quedar en uso real.
 */
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

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

const args = process.argv.slice(2);
const crear = args.includes("--crear");
const email = args.find(a => !a.startsWith("--")) ?? "hola@cubicosdigital.cl";

/** Contraseña legible pero con suficiente entropía (~93 bits). */
function generarClave() {
  const abc = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const cuerpo = [...bytes].map(b => abc[b % abc.length]).join("");
  return `${cuerpo.slice(0, 6)}-${cuerpo.slice(6, 11)}-${cuerpo.slice(11, 16)}`;
}

const cab = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// ─── Buscar el usuario ─────────────────────────────────────────────
const lista = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: cab });
if (!lista.ok) {
  console.error(`No se pudo consultar Auth: ${lista.status} ${await lista.text()}`);
  process.exit(1);
}
const { users = [] } = await lista.json();
const usuario = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

const clave = generarClave();

if (!usuario) {
  if (!crear) {
    console.error(`❌ No existe "${email}" en Supabase Auth.`);
    console.error(`   Usuarios actuales: ${users.map(u => u.email).join(", ") || "(ninguno)"}`);
    console.error(`   Para crearlo:  node scripts/resetear-clave-admin.mjs ${email} --crear`);
    process.exit(1);
  }

  const r = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({ email, password: clave, email_confirm: true }),
  });
  if (!r.ok) {
    console.error(`No se pudo crear el usuario: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  console.log(`✅ Usuario creado en Auth: ${email}`);

  // Además necesita fila en usuarios_admin para pasar el guard del panel.
  const fila = await fetch(`${URL}/rest/v1/usuarios_admin`, {
    method: "POST",
    headers: { ...cab, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ email, nombre: email.split("@")[0], rol: "admin", activo: true }),
  });
  console.log(fila.ok ? "✅ Fila creada en usuarios_admin" : `⚠️  usuarios_admin: ${await fila.text()}`);
} else {
  const r = await fetch(`${URL}/auth/v1/admin/users/${usuario.id}`, {
    method: "PUT",
    headers: cab,
    body: JSON.stringify({ password: clave }),
  });
  if (!r.ok) {
    console.error(`No se pudo cambiar la contraseña: ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  console.log(`✅ Contraseña actualizada para ${email}`);
}

console.log("");
console.log("  ┌─────────────────────────────────────────────┐");
console.log(`    email:      ${email}`);
console.log(`    contraseña: ${clave}`);
console.log("  └─────────────────────────────────────────────┘");
console.log("");
console.log("  Entra en  http://localhost:3002/admin/login");
console.log("  Esta clave se muestra una sola vez. Guárdala o cámbiala después.");
