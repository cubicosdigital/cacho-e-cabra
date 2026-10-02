import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requirePermiso } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("postulaciones", "u");
  if (g.error) return g.error;

  const body = await req.json();
  const { data, error } = await g.db.from("postulaciones").update(body).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermiso("postulaciones", "d");
  if (g.error) return g.error;

  const { data: post } = await g.db.from("postulaciones").select("cv_url").eq("id", id).maybeSingle();
  const { error } = await g.db.from("postulaciones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (post?.cv_url?.startsWith("/uploads/cv/")) await fs.unlink(path.join(process.cwd(), "public", post.cv_url)).catch(() => {});
  return NextResponse.json({ ok: true });
}
