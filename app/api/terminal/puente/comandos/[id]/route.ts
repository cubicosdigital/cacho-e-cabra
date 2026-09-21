import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verificarPuente } from "@/lib/terminal-servidor";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const noAutorizado = verificarPuente(req);
  if (noAutorizado) return noAutorizado;

  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const { error } = await getSupabase().from("terminal_comandos").update({
    estado: b.ok === true ? "ok" : "error", resultado: String(b.resultado ?? "").slice(0, 500), ejecutado_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
