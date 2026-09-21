import { NextRequest, NextResponse } from "next/server";
import { requirePermiso } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const g = await requirePermiso("denuncias", "c");
  if (g.error) return g.error;
  const db = g.db;

  const { tipo, descripcion, anonima, nombre_denunciante } = await req.json();
  if (!tipo || !descripcion?.trim()) return NextResponse.json({ error: "Falta tipo o descripción" }, { status: 400 });

  let empleado_id: string | null = null;
  if (!anonima) {
    {
      const { data: emp } = await db.from("empleados").select("id").eq("usuario_admin_id", g.usuario.id).maybeSingle();
      empleado_id = emp?.id ?? null;
    }
  }

  const { data, error } = await db.from("denuncias").insert({
    tipo, descripcion: descripcion.trim(), anonima: !!anonima,
    nombre_denunciante: anonima ? null : (nombre_denunciante?.trim() || null),
    empleado_id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const g = await requirePermiso("denuncias", "r");
  if (g.error) return g.error;
  const db = g.db;

  const { data, error } = await db.from("denuncias").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
