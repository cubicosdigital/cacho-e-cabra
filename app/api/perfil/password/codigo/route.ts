import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAnonSinSesion } from "@/lib/registro";

// Paso 1 de cambiar la contraseña: se envía un código al correo de la cuenta.
export async function POST() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { error } = await supabaseAnonSinSesion().auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } });
  if (error) return NextResponse.json({ error: "No se pudo enviar el código. Espera un minuto e inténtalo de nuevo." }, { status: 429 });
  return NextResponse.json({ ok: true, correo: user.email });
}
