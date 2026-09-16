import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Público: cualquiera puede darle like a una foto o video, sin login. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await getSupabase().rpc("incrementar_like_galeria", { item_id: id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ likes: data });
}
