import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { HORA_ENTRADA_ESPERADA, TOLERANCIA_MIN, minutos, resumirDias, type Marca } from "@/lib/asistencia";
import { contratoCompleto, type Ficha } from "@/lib/fichas";
import { LATIDO_VIGENCIA_S } from "@/lib/terminal";

const TZ = "America/Santiago";
const DIAS_HISTORIAL = 180;
const NOMBRE_DIA = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

const dia = (d: Date | string) => new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ });
const hora = (d: Date | string) => new Date(d).toLocaleTimeString("sv-SE", { timeZone: TZ });
const sumarDias = (f: string, n: number) => new Date(new Date(`${f}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400_000);

type Fila = Record<string, unknown>;

/** Trae todas las filas de una consulta aunque pasen de las 1.000 que entrega Supabase por vez. */
async function traer<T = Fila>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await consulta(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = getSupabase();
  const ahora = new Date();
  const hoy = dia(ahora);
  const desdeVentas = new Date(ahora.getTime() - DIAS_HISTORIAL * 86400_000).toISOString();
  const desdeSemana = sumarDias(hoy, -6);

  try {
    const [pedidos, delivery, itemsLocal, productos, empleados, fichas, turnos, asistencias, reclamos, denuncias, tareas, presupuestos, eventos, registros, notifs, terminal] = await Promise.all([
      traer<{ id: string; total: number; estado: string; created_at: string; mesa_numero: string }>((a, b) => db.from("pedidos").select("id,total,estado,created_at,mesa_numero").gte("created_at", desdeVentas).range(a, b)),
      traer<{ total: number; estado: string; created_at: string; items: { nombre: string; cantidad: number; precio: number }[] }>((a, b) => db.from("delivery_pedidos").select("total,estado,created_at,items").gte("created_at", desdeVentas).range(a, b)),
      traer<{ nombre: string; categoria: string; cantidad: number; precio_unitario: number; pedidos: { created_at: string; estado: string } | { created_at: string; estado: string }[] }>((a, b) =>
        db.from("items_pedido").select("nombre,categoria,cantidad,precio_unitario,pedidos!inner(created_at,estado)").gte("pedidos.created_at", desdeVentas).range(a, b)),
      traer<{ nombre: string; categoria: string; disponible: boolean }>((a, b) => db.from("productos").select("nombre,categoria,disponible").range(a, b)),
      traer<{ id: string; nombre: string; cargo: string | null; departamento: string; control_asistencia: boolean }>((a, b) => db.from("empleados").select("id,nombre,cargo,departamento,control_asistencia").eq("activo", true).order("nombre").range(a, b)),
      traer<Ficha>((a, b) => db.from("fichas_empleado").select("*").range(a, b)),
      traer<{ empleado_id: string; dia_semana: string; hora_entrada: string | null; horas: number }>((a, b) => db.from("turnos").select("empleado_id,dia_semana,hora_entrada,horas").range(a, b)),
      traer<Marca>((a, b) => db.from("asistencias").select("empleado_id,fecha,hora,tipo").gte("fecha", desdeSemana).range(a, b)),
      traer<{ estado: string }>((a, b) => db.from("reclamos").select("estado").range(a, b)),
      traer<{ estado: string; tipo: string }>((a, b) => db.from("denuncias").select("estado,tipo").range(a, b)),
      traer<{ estado: string; fecha_limite: string | null; prioridad: string }>((a, b) => db.from("tareas").select("estado,fecha_limite,prioridad").range(a, b)),
      traer<{ estado: string; precio_por_persona: number; personas: number; creado_en: string }>((a, b) => db.from("presupuestos").select("estado,precio_por_persona,personas,creado_en").range(a, b)),
      traer<{ id: string; titulo: string; emoji: string; registrados: number; cupos: number; precio: number; estado: string; publicado: boolean }>((a, b) => db.from("eventos").select("id,titulo,emoji,registrados,cupos,precio,estado,publicado").order("orden").range(a, b)),
      traer<{ evento_id: string; confirmado: boolean; personas: number }>((a, b) => db.from("evento_registros").select("evento_id,confirmado,personas").range(a, b)),
      db.from("notificaciones").select("id", { count: "exact", head: true }).eq("leida", false),
      db.from("terminal_estado").select("*").eq("id", "principal").maybeSingle(),
    ]);

    // ── Ventas ────────────────────────────────────────────────────────
    const porDia = new Map<string, { local: number; delivery: number; pedidos: number }>();
    const acumular = (fecha: string, campo: "local" | "delivery", total: number) => {
      const d = porDia.get(fecha) ?? { local: 0, delivery: 0, pedidos: 0 };
      d[campo] += total; d.pedidos += 1;
      porDia.set(fecha, d);
    };
    for (const p of pedidos) if (p.estado === "entregado") acumular(dia(p.created_at), "local", p.total);
    for (const p of delivery) if (p.estado === "entregado") acumular(dia(p.created_at), "delivery", p.total);

    const totalDia = (f: string) => { const d = porDia.get(f); return d ? d.local + d.delivery : 0; };
    const mesActual = hoy.slice(0, 7);
    const diaDelMes = Number(hoy.slice(8));
    const finMesAnt = sumarDias(`${mesActual}-01`, -1);
    const mesAnterior = finMesAnt.slice(0, 7);
    let mes = 0, mesAnt = 0, tot30 = 0, n30 = 0;
    let mejor: { fecha: string; total: number } | null = null;
    for (const [f, d] of porDia) {
      const t = d.local + d.delivery;
      if (f.startsWith(mesActual)) mes += t;
      if (f.startsWith(mesAnterior) && Number(f.slice(8)) <= diaDelMes) mesAnt += t;
      if (diasEntre(f, hoy) < 30) { tot30 += t; n30 += d.pedidos; }
      if (!mejor || t > mejor.total) mejor = { fecha: f, total: t };
    }

    const categoriaDe = new Map(productos.map(p => [p.nombre, p.categoria]));
    const items = new Map<string, { fecha: string; nombre: string; categoria: string; cantidad: number; monto: number }>();
    const sumarItem = (fecha: string, nombre: string, categoria: string, cantidad: number, precio: number) => {
      const k = `${fecha}|${nombre}`;
      const it = items.get(k) ?? { fecha, nombre, categoria, cantidad: 0, monto: 0 };
      it.cantidad += cantidad; it.monto += cantidad * precio;
      items.set(k, it);
    };
    for (const i of itemsLocal) {
      const p = Array.isArray(i.pedidos) ? i.pedidos[0] : i.pedidos;
      if (p?.estado === "entregado") sumarItem(dia(p.created_at), i.nombre, i.categoria, i.cantidad, i.precio_unitario);
    }
    for (const p of delivery) if (p.estado === "entregado") for (const i of p.items ?? []) sumarItem(dia(p.created_at), i.nombre, categoriaDe.get(i.nombre) ?? "delivery", i.cantidad, i.precio);

    const activosLocal = pedidos.filter(p => ["recibido", "preparando", "listo"].includes(p.estado));
    const activosDelivery = delivery.filter(p => ["recibido", "preparando", "en_camino"].includes(p.estado));
    const esperaMin = [...activosLocal, ...activosDelivery].filter(p => p.estado === "recibido").map(p => (ahora.getTime() - Date.parse(p.created_at)) / 60000);

    // ── Equipo ────────────────────────────────────────────────────────
    const controlados = empleados.filter(e => e.control_asistencia);
    const diaSemana = NOMBRE_DIA[new Date(`${hoy}T12:00:00Z`).getUTCDay()];
    const turnoHoy = new Map(turnos.filter(t => t.dia_semana === diaSemana && t.horas > 0).map(t => [t.empleado_id, t]));
    const horaAhora = minutos(hora(ahora));

    const equipoHoy = controlados.map(e => {
      const marcas = asistencias.filter(a => a.empleado_id === e.id && a.fecha === hoy).sort((x, y) => x.hora.localeCompare(y.hora));
      const primera = marcas.find(m => m.tipo === "entrada");
      const turno = turnoHoy.get(e.id);
      const entradaEsperada = turno?.hora_entrada ? minutos(turno.hora_entrada) : minutos(HORA_ENTRADA_ESPERADA);
      const estado = marcas.length === 0 ? "sin_marcar" : marcas[marcas.length - 1].tipo === "entrada" ? "dentro" : "salio";
      return {
        id: e.id, nombre: e.nombre, cargo: e.cargo, estado,
        desde: primera ? primera.hora.slice(0, 5) : null,
        tarde: primera ? minutos(primera.hora) > entradaEsperada + TOLERANCIA_MIN : false,
        esperado: !!turno,
        ausente: !!turno && marcas.length === 0 && horaAhora > entradaEsperada + 15,
      };
    });

    const semana = resumirDias(asistencias.filter(a => controlados.some(c => c.id === a.empleado_id)));
    const semanaMin = semana.reduce((s, d) => s + (d.trabajado ?? 0), 0);
    const conEntrada = semana.filter(d => d.entrada);
    const puntualSemana = conEntrada.length ? Math.round((conEntrada.filter(d => !d.tarde).length / conEntrada.length) * 100) : null;

    // ── Trabajadores: fichas y vencimientos ───────────────────────────
    const ficha = new Map(fichas.map(f => [f.empleado_id, f]));
    const nombre = new Map(empleados.map(e => [e.id, e.nombre]));
    const contratosPendientes = fichas.filter(f => f.registrado_at && !contratoCompleto(f)).map(f => ({ id: f.empleado_id, nombre: nombre.get(f.empleado_id) ?? "" }));
    const sinFicha = empleados.filter(e => !ficha.get(e.id)?.registrado_at).length;
    const vencimientos: { empleado_id: string; nombre: string; tipo: string; fecha: string; dias: number }[] = [];
    for (const f of fichas) {
      if (f.visa_vencimiento) vencimientos.push({ empleado_id: f.empleado_id, nombre: nombre.get(f.empleado_id) ?? "", tipo: "Permiso de trabajo", fecha: f.visa_vencimiento, dias: diasEntre(hoy, f.visa_vencimiento) });
      if (f.manipulador_alimentos && f.manipulador_vencimiento) vencimientos.push({ empleado_id: f.empleado_id, nombre: nombre.get(f.empleado_id) ?? "", tipo: "Manipulador de alimentos", fecha: f.manipulador_vencimiento, dias: diasEntre(hoy, f.manipulador_vencimiento) });
    }
    const porVencer = vencimientos.filter(v => v.dias <= 90).sort((a, b) => a.dias - b.dias);

    // ── Pendientes del negocio ────────────────────────────────────────
    const tareasAbiertas = tareas.filter(t => t.estado !== "completada");
    const tareasVencidas = tareasAbiertas.filter(t => t.fecha_limite && t.fecha_limite < hoy).length;
    const enviados = presupuestos.filter(p => p.estado === "enviado");
    const pipeline = { enviados: enviados.length, monto: enviados.reduce((s, p) => s + p.precio_por_persona * p.personas, 0), aceptados: presupuestos.filter(p => p.estado === "aceptado").length, montoAceptado: presupuestos.filter(p => p.estado === "aceptado").reduce((s, p) => s + p.precio_por_persona * p.personas, 0) };
    const sinResponder = enviados.filter(p => diasEntre(dia(p.creado_en), hoy) >= 7).length;

    const eventosPub = eventos.filter(e => e.publicado).map(e => ({
      id: e.id, titulo: e.titulo, emoji: e.emoji, registrados: e.registrados, cupos: e.cupos, precio: e.precio, estado: e.estado,
      porConfirmar: registros.filter(r => r.evento_id === e.id && !r.confirmado).length,
    }));

    const t = terminal.data as { terminal_ok: boolean; ultimo_latido: string | null; ultima_sync: string | null; marcaciones: number | null; usuarios: number | null } | null;
    const latidoS = t?.ultimo_latido ? (ahora.getTime() - Date.parse(t.ultimo_latido)) / 1000 : Infinity;

    const nReclamos = reclamos.filter(r => r.estado === "nuevo").length;
    const nDenuncias = denuncias.filter(d => d.estado === "nueva").length;
    const nNotifs = notifs.count ?? 0;

    // ── Avisos: lo que hay que mirar primero ──────────────────────────
    type Aviso = { nivel: "rojo" | "ambar" | "info"; texto: string; href: string };
    const avisos: Aviso[] = [];
    const largos = esperaMin.filter(m => m >= 10).length;
    if (largos > 0) avisos.push({ nivel: "rojo", texto: `${largos} pedido${largos > 1 ? "s" : ""} esperando más de 10 minutos sin atender`, href: "/admin/pedidos" });
    if (nDenuncias > 0) avisos.push({ nivel: "rojo", texto: `${nDenuncias} denuncia${nDenuncias > 1 ? "s" : ""} nueva${nDenuncias > 1 ? "s" : ""} por revisar`, href: "/admin/denuncias" });
    for (const v of porVencer.filter(v => v.dias <= 30)) avisos.push({ nivel: v.dias < 0 ? "rojo" : "ambar", texto: `${v.tipo} de ${v.nombre.split(" ")[0]} ${v.dias < 0 ? `venció hace ${-v.dias} días` : `vence en ${v.dias} días`}`, href: `/admin/trabajadores/${v.empleado_id}` });
    if (nReclamos > 0) avisos.push({ nivel: "ambar", texto: `${nReclamos} reclamo${nReclamos > 1 ? "s" : ""} o comentario${nReclamos > 1 ? "s" : ""} de clientes sin leer`, href: "/admin/reclamos" });
    if (tareasVencidas > 0) avisos.push({ nivel: "ambar", texto: `${tareasVencidas} tarea${tareasVencidas > 1 ? "s" : ""} vencida${tareasVencidas > 1 ? "s" : ""}`, href: "/admin/tareas" });
    if (sinResponder > 0) avisos.push({ nivel: "ambar", texto: `${sinResponder} presupuesto${sinResponder > 1 ? "s" : ""} enviado${sinResponder > 1 ? "s" : ""} sin respuesta hace más de una semana`, href: "/admin/presupuestos" });
    for (const c of contratosPendientes) avisos.push({ nivel: "ambar", texto: `${c.nombre.split(" ")[0]} ya se registró: falta completar su contrato`, href: `/admin/trabajadores/${c.id}` });
    const ausentes = equipoHoy.filter(e => e.ausente);
    if (ausentes.length > 0) avisos.push({ nivel: "ambar", texto: `${ausentes.map(a => a.nombre.split(" ")[0]).join(", ")} debía${ausentes.length > 1 ? "n" : ""} estar y no ha marcado`, href: "/admin/asistencia" });
    const porConfirmar = eventosPub.reduce((s, e) => s + e.porConfirmar, 0);
    if (porConfirmar > 0) avisos.push({ nivel: "info", texto: `${porConfirmar} inscripción${porConfirmar > 1 ? "es" : ""} a eventos por confirmar`, href: "/admin/invitados" });
    if (nNotifs > 0) avisos.push({ nivel: "info", texto: `${nNotifs} notificación${nNotifs > 1 ? "es" : ""} sin leer`, href: "/admin/notificaciones" });

    return NextResponse.json({
      ahora: ahora.toISOString(), hoy, hora: hora(ahora).slice(0, 5),
      avisos,
      ventas: {
        hoy: totalDia(hoy), hoyLocal: porDia.get(hoy)?.local ?? 0, hoyDelivery: porDia.get(hoy)?.delivery ?? 0,
        mismoDiaSemPasada: totalDia(sumarDias(hoy, -7)), diaSemana,
        mes, mesAnterior: mesAnt, ticket30: n30 ? Math.round(tot30 / n30) : 0, pedidos30: n30, mejorDia: mejor,
        porDia: [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, d]) => ({ fecha, ...d })),
        items: [...items.values()],
        activos: {
          local: activosLocal.length, delivery: activosDelivery.length,
          recibidos: [...activosLocal, ...activosDelivery].filter(p => p.estado === "recibido").length,
          esperaMaxMin: esperaMin.length ? Math.round(Math.max(...esperaMin)) : 0,
        },
      },
      equipo: {
        hoy: equipoHoy, dentro: equipoHoy.filter(e => e.estado === "dentro").length, esperadosHoy: equipoHoy.filter(e => e.esperado).length,
        semana: { horasMin: semanaMin, puntualidad: puntualSemana, diasConMarcas: new Set(semana.map(d => d.fecha)).size },
        terminal: { conectado: latidoS < LATIDO_VIGENCIA_S && t?.terminal_ok === true, ultimaSync: t?.ultima_sync ?? null, marcaciones: t?.marcaciones ?? null, usuarios: t?.usuarios ?? null },
        total: controlados.length,
      },
      trabajadores: { total: empleados.length, sinFicha, contratosPendientes: contratosPendientes.length, porVencer },
      pendientes: {
        reclamos: nReclamos, denuncias: nDenuncias, tareas: tareasAbiertas.length, tareasVencidas,
        tareasUrgentes: tareasAbiertas.filter(x => x.prioridad === "urgente" || x.prioridad === "alta").length, notificaciones: nNotifs,
      },
      presupuestos: { ...pipeline, sinResponder },
      eventos: eventosPub,
      carta: { productos: productos.length, agotados: productos.filter(p => !p.disponible).length },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
