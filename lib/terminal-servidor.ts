import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/** Valida el "Authorization: Bearer <clave>" que manda el programa puente. Devuelve la respuesta de error o null. */
export function verificarPuente(req: Request): NextResponse | null {
  const esperado = process.env.TERMINAL_BRIDGE_TOKEN;
  if (!esperado) return NextResponse.json({ error: "El servidor no tiene configurado TERMINAL_BRIDGE_TOKEN" }, { status: 500 });
  const recibido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recibido), b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return null;
}
