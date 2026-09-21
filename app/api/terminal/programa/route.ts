import { NextResponse } from "next/server";
import { strToU8, zipSync } from "fflate";
import { requireAdmin } from "@/lib/admin-auth";
import { PUENTE_PY } from "@/lib/puente-fuente";

// Entrega el programa de conexión ya configurado (dirección de esta web app + clave) para abrirlo en un computador del local.
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const token = process.env.TERMINAL_BRIDGE_TOKEN;
  if (!token) return NextResponse.json({ error: "Falta TERMINAL_BRIDGE_TOKEN en el servidor" }, { status: 500 });

  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;

  const script = `#!/bin/sh
# Programa de conexión con el terminal de huellas de Cacho Cabra.
# Déjalo abierto mientras uses «Config. Terminal ZK» en el admin. Ciérralo cuando termines.
DIR="$HOME/.cacho-cabra-terminal"
mkdir -p "$DIR" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Este computador no tiene Python 3. Instálalo desde python.org y vuelve a abrir este archivo."
  read -r _; exit 1
fi

cat > "$DIR/puente.py" <<'PUENTE_PY_FIN'
${PUENTE_PY}PUENTE_PY_FIN

cat > "$DIR/.env" <<'ENV_FIN'
APP_URL=${proto}://${host}
BRIDGE_TOKEN=${token}
ENV_FIN
chmod 600 "$DIR/.env"

if [ ! -d "$DIR/.venv" ]; then
  echo "Preparando todo por primera vez (necesita internet, tarda un minuto)..."
  python3 -m venv "$DIR/.venv" || { read -r _; exit 1; }
fi
"$DIR/.venv/bin/pip" install -q pyzk==0.9 tzdata || { echo "No se pudo instalar lo necesario. Revisa la conexión a internet."; read -r _; exit 1; }

echo "Conectando con el terminal. No cierres esta ventana mientras uses el admin."
exec "$DIR/.venv/bin/python" "$DIR/puente.py"
`;

  // El .command va dentro de un ZIP para conservar el permiso de ejecución (un archivo suelto descargado no lo trae).
  const zip = zipSync({
    "Conectar terminal.command": [strToU8(script), { os: 3, attrs: 0o100755 << 16, mtime: new Date() }],
  });

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="Conectar terminal Cacho Cabra.zip"',
      "Cache-Control": "no-store",
    },
  });
}
