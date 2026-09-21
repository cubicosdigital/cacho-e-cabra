import { NextResponse } from "next/server";
import { cargarInvitacion } from "@/lib/registro";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dato = await cargarInvitacion(token);
  if (!dato) return NextResponse.json({ error: "Este link no es válido o ya venció. Pide uno nuevo a tu administrador." }, { status: 404 });
  const { empleado, inv } = dato;
  return NextResponse.json({
    nombre: empleado.nombre, rut: empleado.rut, cargo: empleado.cargo, departamento: empleado.departamento, telefono: inv.telefono,
  });
}
