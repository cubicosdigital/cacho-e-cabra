import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { nombreParaTerminal, type TipoComando } from "@/lib/terminal";

const TIPOS: TipoComando[] = ["sincronizar_usuarios", "ajustar_hora", "iniciar_huella", "borrar_usuario", "descargar_marcaciones"];

export async function POST(req: NextRequest) {
  const { db, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const tipo = body.tipo as TipoComando;
  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: "Orden no válida" }, { status: 400 });

  const { count } = await db.from("terminal_comandos").select("id", { count: "exact", head: true })
    .eq("tipo", tipo).in("estado", ["pendiente", "en_proceso"]);
  if (count) return NextResponse.json({ error: "Ya hay una orden igual en curso. Espera a que termine." }, { status: 409 });

  const { data: todos, error: errEmp } = await db.from("empleados").select("id, nombre, zk_id, control_asistencia").eq("activo", true).order("nombre");
  if (errEmp) return NextResponse.json({ error: errEmp.message }, { status: 500 });
  const empleados = todos ?? [];

  // A quien aún no tiene ID de terminal se le asigna el siguiente número libre.
  let siguiente = Math.max(0, ...empleados.map(e => e.zk_id ?? 0)) + 1;
  async function asegurarId(e: { id: string; zk_id: number | null }) {
    if (e.zk_id != null) return e.zk_id;
    const nuevo = siguiente++;
    await db.from("empleados").update({ zk_id: nuevo }).eq("id", e.id);
    e.zk_id = nuevo;
    return nuevo;
  }

  let payload: Record<string, unknown> = {};

  if (tipo === "sincronizar_usuarios") {
    const ids: string[] = Array.isArray(body.empleado_ids) ? body.empleado_ids : [];
    const lista = empleados.filter(e => ids.includes(e.id));
    const usuarios = [];
    for (const e of lista) usuarios.push({ zk_id: await asegurarId(e), nombre: nombreParaTerminal(e.nombre) });
    if (usuarios.length === 0) return NextResponse.json({ error: "Selecciona al menos un trabajador para cargar" }, { status: 400 });
    payload = { usuarios };
  }

  if (tipo === "iniciar_huella" || tipo === "borrar_usuario") {
    const e = empleados.find(x => x.id === body.empleado_id);
    if (!e) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
    const zk_id = await asegurarId(e);
    const dedo = Number.isInteger(body.dedo) && body.dedo >= 0 && body.dedo <= 9 ? body.dedo : 0;
    payload = tipo === "iniciar_huella" ? { zk_id, nombre: nombreParaTerminal(e.nombre), dedo } : { zk_id, nombre: e.nombre };
  }

  const { data, error: err } = await db.from("terminal_comandos").insert({ tipo, payload }).select("*").single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json(data);
}
