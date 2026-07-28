"use client";

import { useState } from "react";
import Image from "next/image";

type EstadoDev = "completado" | "en-progreso" | "pendiente" | "bloqueado";

interface Req {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoDev;
  prioridad: "urgente" | "alta" | "media" | "baja";
  tipo: "front" | "admin" | "infra" | "ambos";
}

interface Modulo {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  nuevo?: boolean;
  reqs: Req[];
}

const BG      = "#2d2b27";
const SURFACE = "#383430";
const SURF2   = "#433f3a";
const BORDER  = "#504b46";
const TEXT1   = "#f5f2ee";
const TEXT2   = "#d8d2cc";
const TEXT3   = "#b0a89f";
const AMR     = "#FBBF24";
const ROJO    = "#f05252";
const VERDE   = "#34d399";
const AZUL    = "#60a5fa";
const FONT    = "var(--font-dm), sans-serif";
const TITLE   = "var(--font-raleway), sans-serif";

const TIPOS: Record<string, { label: string; color: string }> = {
  front: { label: "Front",  color: AZUL   },
  admin: { label: "Admin",  color: "#a78bfa" },
  infra: { label: "Infra",  color: TEXT3   },
  ambos: { label: "Front + Admin", color: VERDE },
};

const EST_DEV: { value: EstadoDev; label: string; dot: string; tag: string }[] = [
  { value: "completado",  label: "Completado",  dot: VERDE,  tag: "bg-emerald-900/60 text-emerald-300"  },
  { value: "en-progreso", label: "En progreso", dot: AMR,    tag: "bg-yellow-400/20 text-yellow-300"    },
  { value: "pendiente",   label: "Pendiente",   dot: "#706860", tag: "bg-[#433f3a] text-[#d8d2cc]"    },
  { value: "bloqueado",   label: "Bloqueado",   dot: ROJO,   tag: "bg-red-950 text-red-300"             },
];

const MODULOS: Modulo[] = [
  {
    id: "infra",
    nombre: "Infraestructura Base",
    emoji: "⚙️",
    descripcion: "Next.js 16 + Supabase + Digital Ocean VPS. Deploy compilado a servidor propio.",
    reqs: [
      { id: "i01", nombre: "Setup Next.js + Supabase + repositorio", descripcion: "Repo cacho-cabra creado con stack estándar.", estado: "completado", prioridad: "urgente", tipo: "infra" },
      { id: "i02", nombre: "Deploy Digital Ocean VPS + dominio cachocabrabar.cl", descripcion: "Build compilado (next build) subido al servidor VPS. DNS + SSL con Nginx o Caddy.", estado: "pendiente", prioridad: "alta", tipo: "infra" },
      { id: "i03", nombre: "Schema Supabase — tablas base", descripcion: "mesas · pedidos · items_pedido · clientes · cupones · fila_espera · eventos · productos · media", estado: "pendiente", prioridad: "urgente", tipo: "infra" },
      { id: "i04", nombre: "Integración Flow — checkout + webhook", descripcion: "Pago en línea con confirmación automática de pedido.", estado: "pendiente", prioridad: "media", tipo: "infra" },
      { id: "i05", nombre: "Notificaciones WhatsApp / SMS", descripcion: "Para fila de espera, reservas, cupones de fidelización y eventos.", estado: "pendiente", prioridad: "alta", tipo: "infra" },
      { id: "i06", nombre: "Backups automáticos + monitoreo errores", descripcion: "Plan de contingencia antes del Go Live.", estado: "pendiente", prioridad: "alta", tipo: "infra" },
    ],
  },
  {
    id: "menu-digital",
    nombre: "Menú Digital + Pedido desde Mesa",
    emoji: "🍽️",
    descripcion: "QR en mesa → menú digital → pedido directo a cocina/barra → cuenta + pago.",
    reqs: [
      { id: "m01", nombre: "Menú digital con 3 secciones", descripcion: "Cafetería, Comida y Tragos importados desde las 3 cartas PDF actuales.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "m02", nombre: "Pedido desde mesa vía QR", descripcion: "El cliente escanea el QR y pide sin mozo.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "m03", nombre: "Envío a cocina / barra en tiempo real", descripcion: "Pedido separado por sección al panel correspondiente.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "m04", nombre: "Cuenta unificada por mesa", descripcion: "Distintos comensales suman a la misma cuenta.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "m05", nombre: "Pago integrado en la mesa (Flow / transferencia)", descripcion: "Checkout al final con múltiples medios de pago.", estado: "pendiente", prioridad: "media", tipo: "front" },
      { id: "m06", nombre: "Up-selling automático al pedir", descripcion: "Al agregar un plato, sugerir maridaje: trago, postre o entrada.", estado: "pendiente", prioridad: "media", tipo: "front" },
      { id: "m07", nombre: "Banner dinámico de destacados", descripcion: "Admin activa: Sugerencias del Chef · Cenas en Vivo · Promo Flash (La Hora del Cabrón 16:00–18:30).", estado: "pendiente", prioridad: "media", tipo: "ambos" },
    ],
  },
  {
    id: "fila",
    nombre: "Fila de Espera Digital",
    emoji: "⏳",
    descripcion: "El cliente se registra desde el móvil y recibe alerta cuando su mesa está lista.",
    reqs: [
      { id: "f01", nombre: "Registro en fila desde QR de entrada", descripcion: "Nombre y teléfono al llegar y ver el local lleno.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "f02", nombre: "Panel de host — gestión de fila en tiempo real", descripcion: "Vista para llamar a la siguiente mesa y ver el estado.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "f03", nombre: "Notificación WhatsApp/SMS automática", descripcion: "'Tu mesa en Cacho Cabra está lista' + link al menú.", estado: "pendiente", prioridad: "alta", tipo: "infra" },
      { id: "f04", nombre: "Estimado de espera visible para el cliente", descripcion: "El cliente ve su posición en la fila y el tiempo estimado.", estado: "pendiente", prioridad: "media", tipo: "front" },
      { id: "f05", nombre: "Botón 'Pedir la cuenta' desde la mesa", descripcion: "El cliente puede marcar desde su QR que está listo para pagar. Aparece como alerta en el panel del host y en el panel de cocina.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "f06", nombre: "Panel host — mesas prontas a salir", descripcion: "El host ve en tiempo real cuántas mesas han pedido la cuenta. Badge de cuenta pendiente sobre cada mesa en el mapa. Prioridad visual para reasignar la mesa rápidamente.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
    ],
  },
  {
    id: "admin-base",
    nombre: "Panel Administrador Base",
    emoji: "🛠️",
    descripcion: "Backoffice para gestión de menú, mesas, pedidos en vivo y analytics básicos.",
    reqs: [
      { id: "a01", nombre: "CRUD de menú completo", descripcion: "Agregar, editar y deshabilitar ítems con foto, precio, descripción y categoría.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "a02", nombre: "Panel de cocina/barra en tiempo real", descripcion: "Pedidos activos con estado: recibido · preparando · listo.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "a03", nombre: "Gestión de mesas y secciones", descripcion: "Mapa visual por zona: salón · terraza · barra.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "a04", nombre: "Analytics y ticket promedio", descripcion: "Ingresos, platos más vendidos, horas pico, ticket por mesa.", estado: "pendiente", prioridad: "media", tipo: "admin" },
    ],
  },
  {
    id: "productos-carta",
    nombre: "Productos, Precios y Carta Digital",
    emoji: "🍽️",
    nuevo: true,
    descripcion: "Catálogo completo del menú con precios, stock, fotos y carta digital para el cliente con carrito y pedido al mesero.",
    reqs: [
      { id: "pc01", nombre: "CRUD de productos del menú", descripcion: "Crear, editar y deshabilitar ítems: nombre, descripción, precio, categoría, foto, disponibilidad diaria.", estado: "en-progreso", prioridad: "urgente", tipo: "admin" },
      { id: "pc02", nombre: "Gestión de precios y variantes", descripcion: "Precio base, precio de hora feliz, precio de eventos especiales. Variantes (tamaño S/M/L, personalización).", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "pc03", nombre: "Control de stock / disponibilidad", descripcion: "Marcar ítem como disponible/agotado desde el admin. Alerta automática cuando un ítem se agota frecuentemente.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "pc04", nombre: "Carta digital pública para el cliente", descripcion: "Menú por categorías (Cafetería / Comida / Tragos / Postres) con fotos, descripción y precio. Fondo oscuro/claro, tamaño de letra ajustable.", estado: "en-progreso", prioridad: "urgente", tipo: "front" },
      { id: "pc05", nombre: "Carrito de pedido en la carta", descripcion: "El cliente agrega ítems al carrito, ve el total en tiempo real y hace el pedido. El pedido llega al panel de cocina/barra.", estado: "en-progreso", prioridad: "urgente", tipo: "front" },
      { id: "pc06", nombre: "Pedido desde la carta → notificación en tiempo real", descripcion: "Al confirmar pedido: POST /api/pedidos → Supabase. El sistema notifica simultáneamente a Admin (panel), Mesero (panel o móvil) y Cajero (panel). El mesero se acerca a la mesa a confirmar el pedido y lo envía como comanda a cocina/barra.", estado: "pendiente", prioridad: "urgente", tipo: "infra" },
      { id: "pc07", nombre: "Historial de precios y auditoría", descripcion: "Registro de cambios de precio por ítem con fecha y usuario. Para auditoría y análisis de márgenes.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "pc08", nombre: "Badge de popular / promo / novedad", descripcion: "Admin marca ítems con badges: Popular, Promo, Nuevo, Sin Gluten, Vegano. Se muestra en la carta del cliente.", estado: "pendiente", prioridad: "media", tipo: "ambos" },
      { id: "pc09", nombre: "Ordenamiento y categorías personalizables", descripcion: "Admin puede reordenar ítems dentro de cada categoría y crear/renombrar categorías.", estado: "pendiente", prioridad: "baja", tipo: "admin" },
    ],
  },
  {
    id: "eventos-cal",
    nombre: "Eventos y Calendario",
    emoji: "📅",
    nuevo: true,
    descripcion: "Sistema completo de eventos con tickets de reserva. Sección pública + gestión admin. Zona VIP para Cenas Clandestinas.",
    reqs: [
      { id: "ev01", nombre: "Sección Eventos en el menú público del front", descripcion: "Página con calendario de actividades visibles para el cliente. Accesible desde el menú principal.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "ev02", nombre: "Reserva de tickets por evento", descripcion: "Formulario: nombre, teléfono, personas, comentario. Confirmación automática por WhatsApp.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "ev03", nombre: "Admin — CRUD de eventos", descripcion: "Crear evento: nombre, descripción, fecha, hora, capacidad, precio, imagen, tipo (público/VIP).", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "ev04", nombre: "Admin — gestión de reservas por evento", descripcion: "Ver lista de reservas, confirmar, cancelar, marcar asistencia.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "ev05", nombre: "Zona VIP — Cenas Clandestinas", descripcion: "Lista cerrada de reservas. Solo accesible a clientes categoría VIP o por link secreto. Sin mostrar menú.", estado: "pendiente", prioridad: "alta", tipo: "ambos" },
      { id: "ev06", nombre: "Calendario visual en admin", descripcion: "Vista mensual de eventos programados para el staff.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "ev07", nombre: "Notificación automática a lista VIP", descripcion: "Al crear Cena Clandestina → notificar vía WhatsApp a clientes con categoría VIP.", estado: "pendiente", prioridad: "media", tipo: "infra" },
    ],
  },
  {
    id: "promociones",
    nombre: "Promociones",
    emoji: "🏷️",
    nuevo: true,
    descripcion: "Crear y gestionar promociones desde el admin. Zona dedicada en el front. Auto-tareas al crear promo.",
    reqs: [
      { id: "pr01", nombre: "Admin — crear y gestionar promociones", descripcion: "Campos: nombre, descripción, precio original, precio promo, fecha inicio, fecha vencimiento, imagen, video, canal de difusión.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "pr02", nombre: "Zona de Promociones en el front", descripcion: "Sección pública dedicada a promos activas. Accesible desde el menú principal.", estado: "pendiente", prioridad: "urgente", tipo: "front" },
      { id: "pr03", nombre: "Auto-tareas al crear una promoción", descripcion: "Al crear promo → generar checklist automático: crear gráfica, crear video, crear campaña RRSS, acciones en local, acciones con personal, medios locales.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "pr04", nombre: "Seguimiento de cumplimiento por promo", descripcion: "Cada promo tiene checklist interno: gráfica ✓, video ✓, IG ✓, FB ✓, aplicado en local ✓.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "pr05", nombre: "Banner de promo activa en el menú digital", descripcion: "Admin activa/desactiva desde el panel. Se muestra en la pantalla del cliente al escanear QR.", estado: "pendiente", prioridad: "media", tipo: "ambos" },
    ],
  },
  {
    id: "zona-chef",
    nombre: "Zona Chef",
    emoji: "👨‍🍳",
    nuevo: true,
    descripcion: "Sección en el front con fotos y videos de los platos estrella. Landing page por plato/trago/torta. Administrable.",
    reqs: [
      { id: "zc01", nombre: "Sección Chef en el front", descripcion: "Zona dedicada con galería de fotos y videos de los platos más destacados del bar y cafetería.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "zc02", nombre: "Landing page por plato / trago / torta", descripcion: "Cada ítem del menú puede tener su propia página: historia, foto, video, descripción extendida, precio y CTA de pedido.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "zc03", nombre: "Admin — fotos, video y descripción por ítem", descripcion: "En el CRUD de menú: agregar foto principal, galería de imágenes, link de video, descripción larga, tags.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "zc04", nombre: "Auto-tarea al agregar producto a la carta", descripcion: "Al crear nuevo ítem en el menú → generar tarea automática: hacer fotos, hacer video, actualizar catastro de medios.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "zc05", nombre: "SEO por plato — URLs amigables", descripcion: "cachocabrabar.cl/chef/gin-barbie — indexable. Meta tags, OG image automáticos.", estado: "pendiente", prioridad: "baja", tipo: "infra" },
    ],
  },
  {
    id: "sva",
    nombre: "SVA — Fidelización y CRM Avanzado",
    emoji: "⭐",
    nuevo: true,
    descripcion: "Identificar clientes recurrentes, saber qué consumen, premiar cumpleaños, categorizar, gestionar zona VIP.",
    reqs: [
      { id: "sv01", nombre: "Captura de datos del cliente en checkout / fila", descripcion: "Nombre, email, teléfono, fecha de cumpleaños. Campo opcional con incentivo: 10% en próxima visita.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "sv02", nombre: "Historial de visitas y consumo por cliente", descripcion: "Frecuencia, gasto total, platos/tragos más consumidos, última visita.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "sv03", nombre: "Identificar clientes más recurrentes", descripcion: "Dashboard con ranking de clientes por visitas, por gasto y por producto favorito.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "sv04", nombre: "Categorización automática de clientes", descripcion: "Casual (1-2 visitas/mes) / Regular (3-4 visitas/mes) / VIP (5+ visitas o gasto alto). Clasificación automática.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "sv05", nombre: "Programa de cumpleaños automatizado", descripcion: "Postre o trago de cortesía el mes del cumpleaños. Envío automático de cupón por WhatsApp.", estado: "pendiente", prioridad: "media", tipo: "infra" },
      { id: "sv06", nombre: "Alerta clientes inactivos", descripcion: "Si un habitual lleva 3+ semanas sin visita → alerta al equipo para reactivar.", estado: "pendiente", prioridad: "baja", tipo: "admin" },
      { id: "sv07", nombre: "Comunicación segmentada por categoría", descripcion: "Promos para Casual. Invitaciones VIP para clientes Premium. Envíos por WhatsApp o email.", estado: "pendiente", prioridad: "media", tipo: "infra" },
      { id: "sv08", nombre: "Zona VIP Cenas Clandestinas — lista premium", descripcion: "Clientes VIP tienen acceso prioritario a las Cenas Clandestinas. Lista privada, sala cerrada.", estado: "pendiente", prioridad: "alta", tipo: "ambos" },
    ],
  },
  {
    id: "turnos",
    nombre: "Turnos y Perfil Trabajador",
    emoji: "👤",
    nuevo: true,
    descripcion: "Módulo interno para gestión de personal: malla de turnos, días trabajados, datos personales y contratos.",
    reqs: [
      { id: "tu01", nombre: "Perfil del trabajador", descripcion: "Ficha con datos personales: nombre, RUT, cargo, foto, teléfono, email, fecha de ingreso, tipo de contrato.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "tu02", nombre: "Malla de turnos semanal", descripcion: "Calendario visual con turnos asignados por persona. Editable por admin. Visible por el propio trabajador.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "tu03", nombre: "Registro de días trabajados", descripcion: "Historial mensual de asistencia: días trabajados, ausencias y horas. Base para liquidaciones.", estado: "pendiente", prioridad: "urgente", tipo: "admin" },
      { id: "tu04", nombre: "Panel personal del trabajador", descripcion: "El trabajador entra con su perfil y ve sus turnos próximos, días trabajados del mes y sus datos personales.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "tu05", nombre: "Gestión de contratos", descripcion: "Adjuntar contrato en PDF. Fechas de inicio y término. Alertas de vencimiento automáticas.", estado: "pendiente", prioridad: "alta", tipo: "admin" },
      { id: "tu06", nombre: "Roles y permisos por cargo", descripcion: "Mesero · Cajero · Cocinero · Barista · Admin. Cada rol ve sólo lo que le corresponde en la Web App.", estado: "pendiente", prioridad: "urgente", tipo: "infra" },
      { id: "tu07", nombre: "Notificación de turno al trabajador", descripcion: "Al publicar la malla → el trabajador recibe WhatsApp con sus próximos turnos.", estado: "pendiente", prioridad: "media", tipo: "infra" },
    ],
  },
  {
    id: "reservas",
    nombre: "Reservas Estándar",
    emoji: "📋",
    descripcion: "Formulario de reserva pública para turistas y grupos. Capacidad por sección y turno.",
    reqs: [
      { id: "re01", nombre: "Formulario de reserva pública", descripcion: "Fecha, hora, personas, nombre y teléfono. Confirmación por WhatsApp.", estado: "pendiente", prioridad: "alta", tipo: "front" },
      { id: "re02", nombre: "Admin — calendario de capacidad por sección", descripcion: "Admin define cupos máximos por sección (salón / terraza / barra) y turno.", estado: "pendiente", prioridad: "media", tipo: "admin" },
      { id: "re03", nombre: "Lunes Clandestinos — registro secreto", descripcion: "Landing sin menú. Solo registro por nombre. Gestión separada del sistema de reservas estándar.", estado: "pendiente", prioridad: "alta", tipo: "ambos" },
    ],
  },
];

export default function EstadoProyectoPage() {
  const [abierto, setAbierto]   = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [estados, setEstados]   = useState<Record<string, EstadoDev>>({});
  const [filtro, setFiltro]     = useState<"todos" | "front" | "admin" | "infra" | "nuevos">("todos");

  function getEst(id: string, base: EstadoDev): EstadoDev {
    return estados[id] ?? base;
  }

  function setEst(id: string, est: EstadoDev) {
    setEstados(prev => ({ ...prev, [id]: est }));
    setEditando(null);
  }

  const allReqs = MODULOS.flatMap(m => m.reqs);
  const total   = allReqs.length;
  const done    = allReqs.filter(r => getEst(r.id, r.estado) === "completado").length;
  const progres = allReqs.filter(r => getEst(r.id, r.estado) === "en-progreso").length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  const modulosFiltrados = MODULOS.map(m => ({
    ...m,
    reqs: m.reqs.filter(r => {
      if (filtro === "todos") return true;
      if (filtro === "nuevos") return m.nuevo;
      return r.tipo === filtro || r.tipo === "ambos";
    }),
  })).filter(m => m.reqs.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1 }}>

      {/* HEADER */}
      <header className="ws-header" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="ws-header-inner" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <Image src="/LogoCachoEcabra.png" alt="Cacho Cabra" width={160} height={125} loading="eager" />
            <div className="ws-header-right" style={{ textAlign: "right" }}>
              <div className="ws-header-title" style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: TEXT1, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Estado Desarrollo
              </div>
              <div style={{ fontSize: 15, color: TEXT3, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                requerimientos técnicos · v2 · jun 2026
              </div>
            </div>
          </div>
          {/* Tags nuevos módulos */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Next.js 16 + Supabase + Digital Ocean VPS", hi: false },
              { label: "6 módulos nuevos ✦",                         hi: true  },
            ].map(t => (
              <span key={t.label} style={{
                fontSize: 16, fontWeight: 500,
                color: t.hi ? AMR : TEXT2,
                background: SURFACE, border: `1px solid ${t.hi ? "#78530a" : BORDER}`,
                borderRadius: 999, padding: "6px 16px",
              }}>{t.label}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="ws-main" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>

        {/* STATS */}
        <div className="ws-stats">
          {[
            { num: `${pct}%`,  label: "Completado",   color: TEXT1 },
            { num: done,       label: "Completados",  color: TEXT1 },
            { num: progres,    label: "En progreso",  color: AMR   },
            { num: total,      label: "Requerimientos", color: TEXT2 },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 22px" }}>
              <div style={{ fontFamily: TITLE, fontSize: "clamp(2.4rem,4vw,3.2rem)", fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.num}</div>
              <div style={{ fontSize: 14, color: TEXT3, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BARRA PROGRESO */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: TEXT2 }}>Progreso técnico global</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: TEXT2 }}>{done}/{total}</span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div style={{ height: "100%", width: `${pct}%`, background: AMR, borderRadius: 99, transition: "width 0.7s" }} />
          </div>
        </div>

        {/* NUEVOS MÓDULOS HIGHLIGHT */}
        <div style={{ background: "#1a1f1a", border: `1px solid #2d5a2d`, borderLeft: `4px solid ${VERDE}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 900, color: VERDE, marginBottom: 16 }}>
            ✦ Nuevos módulos incorporados al desarrollo
          </div>
          <div className="ws-grid2">
            {[
              { emoji: "🍽️", nombre: "Productos, Precios y Carta", desc: "CRUD de productos, control de stock, carta digital con carrito y pedido al mesero. En progreso." },
              { emoji: "📅", nombre: "Eventos y Calendario", desc: "Sistema de tickets de reserva. Zona VIP para Cenas Clandestinas. Front + Admin." },
              { emoji: "🏷️", nombre: "Promociones",          desc: "Crear promos con fecha vencimiento, imagen y video. Auto-tareas de gráfica/video. Front + Admin." },
              { emoji: "👨‍🍳", nombre: "Zona Chef",            desc: "Landing page por plato/trago/torta. Fotos y videos administrables. SEO por ítem." },
              { emoji: "⭐", nombre: "SVA / CRM Avanzado",   desc: "Clientes frecuentes, cumpleaños, categorización, comunicación segmentada, zona VIP." },
            ].map(n => (
              <div key={n.nombre} style={{ background: "#212b21", border: `1px solid #2d5a2d`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: TEXT1, marginBottom: 4 }}>
                  {n.emoji} {n.nombre}
                </div>
                <div style={{ fontSize: 15, color: TEXT2, lineHeight: 1.6 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 6, padding: "4px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, alignSelf: "flex-start", flexWrap: "wrap" }}>
          {(["todos", "nuevos", "front", "admin", "infra"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{
                fontFamily: FONT, fontSize: 15, fontWeight: 600,
                padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                background: filtro === f ? AMR : "transparent",
                color: filtro === f ? "#1a1200" : TEXT3,
                transition: "all 0.15s", textTransform: "capitalize",
              }}>
              {f === "todos" ? "Todos" : f === "nuevos" ? "✦ Nuevos" : f === "front" ? "🖥 Front" : f === "admin" ? "🛠 Admin" : "⚙️ Infra"}
            </button>
          ))}
        </div>

        {/* MÓDULOS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {modulosFiltrados.map(modulo => {
            const mReqs = modulo.reqs;
            const mDone = mReqs.filter(r => getEst(r.id, r.estado) === "completado").length;
            const mPct  = mReqs.length > 0 ? Math.round((mDone / mReqs.length) * 100) : 0;
            const open  = abierto === modulo.id;
            const allD  = mDone === mReqs.length && mReqs.length > 0;
            const accent = allD ? VERDE : modulo.nuevo ? VERDE : BORDER;

            return (
              <div key={modulo.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${accent}`, borderRadius: 16, overflow: "hidden" }}>
                <button onClick={() => setAbierto(open ? null : modulo.id)}
                  style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 28 }}>{modulo.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: TITLE, fontSize: 21, fontWeight: 800, color: TEXT1 }}>{modulo.nombre}</span>
                      {modulo.nuevo && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: VERDE, background: "#1a2e1a", border: `1px solid #2d5a2d`, borderRadius: 6, padding: "2px 8px" }}>NUEVO</span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, color: TEXT2 }}>{modulo.descripcion}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, color: allD ? VERDE : TEXT2 }}>{mPct}%</div>
                    <div style={{ fontSize: 14, color: TEXT3 }}>{mDone}/{mReqs.length}</div>
                  </div>
                  <span style={{ color: TEXT3, fontSize: 16 }}>{open ? "↑" : "↓"}</span>
                </button>
                <div style={{ height: 3, background: SURF2 }}>
                  <div style={{ height: "100%", width: `${mPct}%`, background: allD ? VERDE : "#6b6560", transition: "width 0.5s" }} />
                </div>
                {open && (
                  <div style={{ padding: "8px 16px 16px" }}>
                    {mReqs.map((req, idx) => {
                      const est    = getEst(req.id, req.estado);
                      const estObj = EST_DEV.find(e => e.value === est)!;
                      const tipo   = TIPOS[req.tipo];
                      const isEd   = editando === req.id;
                      return (
                        <div key={req.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 12px", borderRadius: 10, borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ width: 9, height: 9, borderRadius: 99, background: estObj.dot, flexShrink: 0, marginTop: 6 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 17, fontWeight: 700, color: TEXT1 }}>{req.nombre}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: tipo.color, background: SURF2, borderRadius: 6, padding: "2px 8px" }}>{tipo.label}</span>
                              {req.prioridad === "urgente" && (
                                <span className="bg-red-600/25 text-red-300 border border-red-500/40 text-xs font-semibold px-2.5 py-0.5 rounded-full">Urgente</span>
                              )}
                            </div>
                            <div style={{ fontSize: 16, color: TEXT2, lineHeight: 1.65 }}>{req.descripcion}</div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {isEd ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                                {EST_DEV.map(e => (
                                  <button key={e.value} onClick={() => setEst(req.id, e.value)}
                                    className={`${e.tag} text-xs font-semibold px-3 py-1.5 rounded-full`}
                                    style={{ whiteSpace: "nowrap", fontFamily: FONT, border: "none", cursor: "pointer" }}>
                                    {e.label}
                                  </button>
                                ))}
                                <button onClick={() => setEditando(null)} style={{ fontSize: 14, color: TEXT3, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditando(req.id)}
                                className={`${estObj.tag} text-xs font-semibold px-3 py-1.5 rounded-full`}
                                style={{ whiteSpace: "nowrap", fontFamily: FONT, border: "none", cursor: "pointer" }}>
                                {estObj.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* GO LIVE CHECKLIST */}
        <div style={{ background: "#231515", border: `1px solid #6b2020`, borderLeft: `4px solid ${ROJO}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontFamily: TITLE, fontSize: 22, fontWeight: 900, color: ROJO, marginBottom: 18 }}>
            🔴 Pendientes críticos — Go Live
          </div>
          <div className="ws-grid2" style={{ gap: 10 }}>
            {[
              "SSL y dominio (Digital Ocean VPS + Nginx/Caddy)",
              "Pagos reales (Flow producción + webhook)",
              "Backups automáticos + plan contingencia",
              "Correos transaccionales configurados (Resend)",
              "Monitoreo de errores activo",
              "2FA en cuentas administradoras",
              "Schema Supabase completo + RLS",
              "Hardening de servidor",
            ].map(item => (
              <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: ROJO, flexShrink: 0, marginTop: 1 }}>›</span>
                <span style={{ fontSize: 16, color: "#fca5a5", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ textAlign: "center", paddingBottom: 48, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 15, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Cacho &amp; Cabra · Estado Desarrollo · cúbicos · v2 · 2026
          </div>
        </footer>
      </div>
    </div>
  );
}
