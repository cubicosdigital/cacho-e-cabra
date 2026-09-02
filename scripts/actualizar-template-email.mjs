/**
 * Cambia el template de "Magic Link" en Supabase Auth para que el correo
 * muestre el código numérico ({{ .Token }}) en vez de solo el link.
 *
 * Necesita un Personal Access Token de Supabase (no es la SUPABASE_SERVICE_KEY
 * que ya está en .env.local). Se genera acá y NO se guarda en ningún archivo:
 * https://supabase.com/dashboard/account/tokens
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxxx node scripts/actualizar-template-email.mjs
 */
const PROJECT_REF = "gaywkydsjgyegqevsiur";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("Falta SUPABASE_ACCESS_TOKEN. Ejemplo de uso:");
  console.error("  SUPABASE_ACCESS_TOKEN=sbp_xxxxx node scripts/actualizar-template-email.mjs");
  process.exit(1);
}

const html = `
<h2>Recuperar contraseña — Cacho Cabra</h2>
<p>Tu código para recuperar la contraseña es:</p>
<p style="font-size:28px;font-weight:800;letter-spacing:0.1em;">{{ .Token }}</p>
<p>Este código vence en unos minutos. Si no fuiste tú, ignora este correo.</p>
`.trim();

const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_magic_link: "Tu código de recuperación — Cacho Cabra",
    mailer_templates_magic_link_content: html,
  }),
});

if (!r.ok) {
  console.error(`No se pudo actualizar: ${r.status} ${await r.text()}`);
  process.exit(1);
}

console.log("✅ Template de Magic Link actualizado. Ahora el correo mostrará el código.");
