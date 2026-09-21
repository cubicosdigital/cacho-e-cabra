import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { guardarMarcas } from "@/lib/marcas";
import { verificarPuente } from "@/lib/terminal-servidor";
import type { Marca } from "@/lib/terminal";

const FECHA_HORA = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

export async function POST(req: NextRequest) {
  const noAutorizado = verificarPuente(req);
  if (noAutorizado) return noAutorizado;

  const b = await req.json().catch(() => ({}));
  const marcas: Marca[] = Array.isArray(b.marcas) ? b.marcas : [];

  let resultado;
  try { resultado = await guardarMarcas(marcas); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }

  const cambios: Record<string, unknown> = { ultima_sync: new Date().toISOString() };
  if (typeof b.hasta === "string" && FECHA_HORA.test(b.hasta)) cambios.ultima_marca = b.hasta;
  await getSupabase().from("terminal_estado").upsert({ id: "principal", ...cambios }, { onConflict: "id" });

  return NextResponse.json({ recibidas: marcas.length, guardadas: resultado.guardadas, ids_sin_mapear: resultado.sinMapear });
}
