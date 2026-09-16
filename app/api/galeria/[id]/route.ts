import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { supabaseServer } from "@/lib/supabase-server";

/** Borra el archivo subido en /uploads si el ítem era una foto propia (no un ID de Unsplash). */
async function borrarArchivoSubido(url: string | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const destino = path.join(process.cwd(), "public", url);
  try {
    await fs.unlink(destino);
  } catch {
    // Si ya no existe o no se pudo borrar, no bloqueamos el borrado del registro.
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await db.from("galeria_items").update(body).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: item } = await db.from("galeria_items").select("url").eq("id", id).maybeSingle();

  const { error } = await db.from("galeria_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await borrarArchivoSubido(item?.url);
  return NextResponse.json({ ok: true });
}
