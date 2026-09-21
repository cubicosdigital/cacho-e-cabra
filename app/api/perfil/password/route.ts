import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";
import { supabaseAnonSinSesion } from "@/lib/registro";

// Paso 2: con el código recibido por correo se fija la contraseña nueva. Sin código válido no se cambia.
export async function POST(req: NextRequest) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const codigo = String(body.codigo ?? "").replace(/\D/g, "");
  const password = String(body.password ?? "");
  if (codigo.length < 6) return NextResponse.json({ error: "Escribe el código de 6 dígitos que llegó a tu correo." }, { status: 400 });
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres, con letras y números." }, { status: 400 });
  }

  const { error: errCodigo } = await supabaseAnonSinSesion().auth.verifyOtp({ email: user.email, token: codigo, type: "email" });
  if (errCodigo) return NextResponse.json({ error: "El código es incorrecto o ya venció. Pide uno nuevo." }, { status: 400 });

  const { error } = await getSupabase().auth.admin.updateUserById(user.id, { password });
  if (error) return NextResponse.json({ error: "No se pudo cambiar la contraseña. Inténtalo de nuevo." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
