import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { ROL_POR_DEPARTAMENTO } from "@/lib/fichas";
import { EMAIL_RE, OBLIGATORIOS, cargarInvitacion, sanearFicha, supabaseAnonSinSesion } from "@/lib/registro";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dato = await cargarInvitacion(token);
  if (!dato) return NextResponse.json({ error: "Este link no es válido o ya venció." }, { status: 404 });
  const { empleado, inv } = dato;

  const body = await req.json().catch(() => ({}));
  const correo = String(body.email ?? "").trim().toLowerCase();
  const codigo = String(body.codigo ?? "").replace(/\D/g, "");
  if (!EMAIL_RE.test(correo)) return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
  if (codigo.length < 6) return NextResponse.json({ error: "Escribe el código de 6 dígitos que llegó a tu correo." }, { status: 400 });

  const ficha = sanearFicha(body.ficha ?? {});
  for (const [campo, nombre] of OBLIGATORIOS) {
    if (!ficha[campo]) return NextResponse.json({ error: `Falta ${nombre}.` }, { status: 400 });
  }

  // Verificar el código es lo último que puede fallar por culpa del usuario: se consume al usarse.
  const { data: sesion, error: errCodigo } = await supabaseAnonSinSesion().auth.verifyOtp({ email: correo, token: codigo, type: "email" });
  if (errCodigo || !sesion.session) return NextResponse.json({ error: "El código es incorrecto o ya venció. Pide uno nuevo." }, { status: 400 });

  const db = getSupabase();
  const ahora = new Date().toISOString();

  const { data: cuenta, error: errCuenta } = await db
    .from("usuarios_admin")
    .insert({ email: correo, nombre: empleado.nombre, rol: ROL_POR_DEPARTAMENTO[empleado.departamento] ?? "mesero" })
    .select("id")
    .single();
  if (errCuenta) return NextResponse.json({ error: "Ese correo ya está registrado en el sistema." }, { status: 409 });

  await db.from("empleados").update({ usuario_admin_id: cuenta.id }).eq("id", empleado.id);
  const { error: errFicha } = await db.from("fichas_empleado").upsert({
    empleado_id: empleado.id, email: correo, ...ficha,
    consentimiento_fecha: ficha.consentimiento ? ahora : null, registrado_at: ahora, updated_at: ahora,
  }, { onConflict: "empleado_id" });
  if (errFicha) return NextResponse.json({ error: "No se pudo guardar tu ficha. Inténtalo de nuevo." }, { status: 500 });

  await db.from("invitaciones").update({ usada_en: ahora }).eq("id", inv.id);
  await db.from("notificaciones").insert({
    tipo: "registro",
    titulo: `${empleado.nombre} se registró`,
    mensaje: "Completa sus datos de contrato: fecha de ingreso, tipo de contrato, jornada y sueldo.",
    empleado_id: empleado.id,
  });

  return NextResponse.json({
    ok: true,
    session: { access_token: sesion.session.access_token, refresh_token: sesion.session.refresh_token },
  });
}
