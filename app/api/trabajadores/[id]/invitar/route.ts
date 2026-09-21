import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizarTelefono } from "@/lib/fichas";

const DIAS_VIGENCIA = 7;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const telefono = normalizarTelefono(String(body.telefono ?? ""));
  if (!telefono) return NextResponse.json({ error: "Teléfono no válido. Ejemplo: 9 1234 5678" }, { status: 400 });

  const { data: emp } = await db.from("empleados").select("id, nombre").eq("id", id).maybeSingle();
  if (!emp) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });

  const token = randomBytes(24).toString("hex");
  const expira_en = new Date(Date.now() + DIAS_VIGENCIA * 86400_000).toISOString();

  const { error: err } = await db.from("invitaciones").insert({ empleado_id: id, token, telefono, expira_en });
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  return NextResponse.json({ token, telefono, nombre: emp.nombre, expira_en, dias: DIAS_VIGENCIA });
}
