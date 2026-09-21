import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { EMAIL_RE, cargarInvitacion, supabaseAnonSinSesion } from "@/lib/registro";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dato = await cargarInvitacion(token);
  if (!dato) return NextResponse.json({ error: "Este link no es válido o ya venció." }, { status: 404 });

  const { email } = await req.json().catch(() => ({ email: "" }));
  const correo = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(correo)) return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });

  const { data: existente } = await getSupabase().from("usuarios_admin").select("id").eq("email", correo).maybeSingle();
  if (existente) return NextResponse.json({ error: "Ese correo ya está registrado en el sistema." }, { status: 409 });

  const { error } = await supabaseAnonSinSesion().auth.signInWithOtp({ email: correo, options: { shouldCreateUser: true } });
  if (error) return NextResponse.json({ error: "No se pudo enviar el código. Espera un minuto e inténtalo de nuevo." }, { status: 429 });

  return NextResponse.json({ ok: true });
}
