"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Estado = "completado" | "en-progreso" | "en-revision" | "pendiente" | "bloqueado";
type Vista   = "lista" | "kanban" | "gantt";

interface Tarea {
  id: string;
  nombre: string;
  descripcion: string;
  estado: Estado;
  prioridad?: "urgente" | "alta" | "media" | "baja";
  responsable?: string;
  notas?: string;
}

interface Modulo {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  fase: "F1" | "F2" | "F3";
  inicioD: number;  // días desde Jun 23
  finD: number;
  tareas: Tarea[];
}

// ─── TOKENS ───────────────────────────────────────────
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
const FONT    = "var(--font-dm), sans-serif";
const TITLE   = "var(--font-raleway), sans-serif";

const ESTADOS: { value: Estado; label: string; dot: string; tag: string }[] = [
  { value: "completado",  label: "Completado",  dot: VERDE,   tag: "bg-emerald-900/60 text-emerald-300"      },
  { value: "en-progreso", label: "En progreso", dot: AMR,     tag: "bg-yellow-400/20 text-yellow-300"        },
  { value: "en-revision", label: "En revisión", dot: "#fde68a", tag: "bg-yellow-200/15 text-yellow-200"      },
  { value: "pendiente",   label: "Pendiente",   dot: "#706860", tag: "bg-[#433f3a] text-[#d8d2cc]"          },
  { value: "bloqueado",   label: "Bloqueado",   dot: ROJO,    tag: "bg-red-950 text-red-300"                 },
];

const PRIO: Record<string, { label: string; tag: string }> = {
  urgente: { label: "Urgente", tag: "bg-red-600/25 text-red-300 border border-red-500/40"         },
  alta:    { label: "Alta",    tag: "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" },
  media:   { label: "Media",   tag: "bg-[#433f3a] text-[#d8d2cc] border border-[#504b46]"         },
  baja:    { label: "Baja",    tag: "bg-[#383430] text-[#b0a89f] border border-[#504b46]"         },
};

// Fase colors
const FASE_COLOR: Record<string, string> = { F1: ROJO, F2: AMR, F3: TEXT2 };

// Timeline: Jun 23 = 0, Oct 31 = 130 días
const T_TOTAL = 130;
const MESES = [
  { label: "JUL", d: 8   },
  { label: "AGO", d: 39  },
  { label: "SEP", d: 70  },
  { label: "OCT", d: 100 },
];

const MODULOS_BASE: Modulo[] = [
  {
    id: "branding",
    nombre: "Branding e Identidad",
    emoji: "🎨",
    descripcion: "Manual de estilo, tono y carácter de la comunicación. Café de Día / Bar de Noche.",
    fase: "F1", inicioD: 0, finD: 21,
    tareas: [
      { id: "br01", nombre: "Manual de estilo y tono de marca", descripcion: "Colores, tipografías, tono: cercano + irreverente + educado.", estado: "pendiente", prioridad: "urgente" },
      { id: "br02", nombre: "QR artístico con lettering", descripcion: "'Invierno se pasa con un buen cocktail' — QR artístico para señalética.", estado: "en-progreso", prioridad: "urgente" },
      { id: "br03", nombre: "Brief identidad visual completo", descripcion: "Definir paleta, tipografías, recursos gráficos base Café de Día y Bar de Noche.", estado: "pendiente", prioridad: "alta" },
    ],
  },
  {
    id: "senaletica",
    nombre: "Señalética Física",
    emoji: "📍",
    descripcion: "QR provisorios, carta exterior, señales físicas críticas, pizarra chef, insertos de mesa.",
    fase: "F1", inicioD: 0, finD: 14,
    tareas: [
      { id: "se01", nombre: "Carta exterior en puerta del local", descripcion: "Gran carta en la entrada para detener flujo peatonal de la Plaza.", estado: "pendiente", prioridad: "urgente" },
      { id: "se02", nombre: "QR provisorios de señalética", descripcion: "Retiro QR viejos + nuevos QR al menú PDF o WhatsApp mientras termina la Web App.", estado: "pendiente", prioridad: "urgente" },
      { id: "se03", nombre: "Señales físicas críticas", descripcion: "Baños, Terraza, Bar, Salida — diseño renovado con identidad Cacho Cabra.", estado: "pendiente", prioridad: "alta" },
      { id: "se04", nombre: "Pizarra del Chef (análoga)", descripcion: "Marco corporativo de madera con logo calado + tiza líquida. Actualiza Sugerencias del Chef y Cenas en Vivo en 2 min.", estado: "pendiente", prioridad: "media" },
      { id: "se05", nombre: "Insertos de mesa acrílicos T (10×15 cm)", descripcion: "Un lado: Brunch/Barista mañana. Girado: Recomendación Chef + Cocktail en Promoción.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "rrss",
    nombre: "Redes Sociales",
    emoji: "📱",
    descripcion: "Metricool Premium en 7 plataformas. Parrilla de contenidos y sistema de rotación gráfica.",
    fase: "F1", inicioD: 0, finD: 14,
    tareas: [
      { id: "rs01", nombre: "Metricool Premium — 7 redes conectadas", descripcion: "IG · TikTok · Facebook · Threads · X · YouTube · Twitch.", estado: "pendiente", prioridad: "urgente" },
      { id: "rs02", nombre: "Estructuración del feed estético", descripcion: "Estrategia muro infinito: reels día a día intercalados con gráficas de diseño limpio.", estado: "pendiente", prioridad: "alta" },
      { id: "rs03", nombre: "Parrilla de contenidos mes 1", descripcion: "Calendario semanal: qué publicar, cuándo, en qué canal.", estado: "pendiente", prioridad: "alta" },
      { id: "rs04", nombre: "Configurar programación automática Metricool", descripcion: "Programación de historias IG y posts de promos activas, Cenas en Vivo y eventos especiales.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "contenido",
    nombre: "Contenido Digital",
    emoji: "🎬",
    descripcion: "3 plantillas base, reels de preparación, gráficas de promoción y sistema de rotación.",
    fase: "F1", inicioD: 7, finD: 57,
    tareas: [
      { id: "co01", nombre: "Plantillas base Sugerencias del Chef / Cenas en Vivo", descripcion: "Para pizarra exterior, historias IG y banner Web App.", estado: "pendiente", prioridad: "urgente" },
      { id: "co02", nombre: "Plantillas base Recomendación Chef/Barista", descripcion: "Inserto físico + Reels de preparación (detrás de escena).", estado: "pendiente", prioridad: "alta" },
      { id: "co03", nombre: "Plantillas base Plato/Trago en Promoción", descripcion: "Post/historia Metricool + alertas en fila de espera digital.", estado: "pendiente", prioridad: "alta" },
      { id: "co04", nombre: "Primer batch de Reels tentación", descripcion: "Platos saliendo de cocina, café sirviéndose, tragos preparándose.", estado: "pendiente", prioridad: "alta" },
      { id: "co05", nombre: "Protocolo de contenido diario", descripcion: "Checklist para el equipo: qué filmar cada día, cómo subir.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "activaciones",
    nombre: "Activaciones de Semana",
    emoji: "🍽️",
    descripcion: "Cenas de Invierno (miércoles Jul-Ago) + Cenas Clandestinas (lunes, 3 fechas). Activar días lentos.",
    fase: "F2", inicioD: 8, finD: 69,
    tareas: [
      { id: "ac01", nombre: "Cenas en Vivo — Lanzamiento Ciclo Semanal (01 Jul)", descripcion: "Arma tu plato eligiendo la salsa entre variedades del día. Ciclo semanal de cocinas del mundo. Sin precio fijo — se elige en el local.", estado: "pendiente", prioridad: "urgente" },
      { id: "ac02", nombre: "Ciclo completo Cenas de Invierno", descripcion: "08/07 Mexicana · 15/07 Tailandesa · 22/07 Chilena · 29/07 American · 05/08 Brasilera.", estado: "pendiente", prioridad: "alta" },
      { id: "ac03", nombre: "1ª Cena Clandestina (06 Jul)", descripcion: "Lunes a puertas cerradas. No se promociona el menú — se vende el misterio del chef.", estado: "pendiente", prioridad: "urgente" },
      { id: "ac04", nombre: "2ª Cena Clandestina (03 Ago)", descripcion: "Exclusividad total. Lista de espera. Pocas mesas.", estado: "pendiente", prioridad: "alta" },
      { id: "ac05", nombre: "3ª Cena Clandestina (31 Ago)", descripcion: "Cierre del ciclo de invierno con evento exclusivo.", estado: "pendiente", prioridad: "alta" },
      { id: "ac06", nombre: "Gráficas y videos para cada activación", descripcion: "Por cada evento: crear gráfica, crear video, publicar en RRSS, enviar a lista VIP.", estado: "pendiente", prioridad: "alta" },
    ],
  },
  {
    id: "promociones",
    nombre: "Promociones y Ofertas",
    emoji: "⚡",
    descripcion: "La Hora del Cabrón, promos flash, Cenas en Vivo. Cada promo genera tareas de gráfica, video y publicación.",
    fase: "F2", inicioD: 28, finD: 130,
    tareas: [
      { id: "pr01", nombre: "La Hora del Cabrón — 16:00 a 18:30", descripcion: "Descuento en hamburguesas/selección. Activar desde admin en la Web App + programar en Metricool.", estado: "pendiente", prioridad: "urgente" },
      { id: "pr02", nombre: "Sistema de promociones en admin", descripcion: "Crear promo con: nombre, descripción, fecha inicio, fecha vencimiento, imagen, video, canal.", estado: "pendiente", prioridad: "alta" },
      { id: "pr03", nombre: "Zona de Promociones en el front", descripcion: "Sección pública dedicada a las promos activas, accesible desde menú principal.", estado: "pendiente", prioridad: "alta" },
      { id: "pr04", nombre: "Auto-tareas al crear promoción", descripcion: "Al crear promo → generar lista: crear gráfica, crear video/fotos, programar en Metricool, acciones en local, acciones con personal.", estado: "pendiente", prioridad: "media" },
      { id: "pr05", nombre: "Seguimiento de cumplimiento por promo", descripcion: "Cada promo tiene checklist: gráfica ✓, video ✓, publicado IG ✓, publicado FB ✓, aplicado en local ✓.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "eventos",
    nombre: "Eventos y Calendario",
    emoji: "📅",
    descripcion: "Sistema de eventos con tickets de reserva. Zona VIP para Cenas Clandestinas. Visible en front y admin.",
    fase: "F2", inicioD: 28, finD: 69,
    tareas: [
      { id: "ev01", nombre: "Sección Eventos en el menú del front", descripcion: "Página pública con calendario de actividades donde la gente puede reservar tickets.", estado: "pendiente", prioridad: "urgente" },
      { id: "ev02", nombre: "Reserva de tickets por evento", descripcion: "Formulario: nombre, teléfono, cantidad de personas. Confirmación por WhatsApp.", estado: "pendiente", prioridad: "urgente" },
      { id: "ev03", nombre: "Admin — crear y gestionar eventos", descripcion: "Crear evento con: nombre, descripción, fecha, capacidad, precio, imagen. Gestionar reservas.", estado: "pendiente", prioridad: "alta" },
      { id: "ev04", nombre: "Lista especial Cenas Clandestinas (Zona VIP)", descripcion: "Zona cerrada de reservas para clientes premium. Registro secreto, sin mostrar menú.", estado: "pendiente", prioridad: "alta" },
      { id: "ev05", nombre: "Calendario visual de actividades", descripcion: "Vista calendario en el admin para ver eventos programados del mes.", estado: "pendiente", prioridad: "media" },
      { id: "ev06", nombre: "Notificación automática a lista VIP", descripcion: "Al crear Cena Clandestina → notificar automáticamente a clientes categoría VIP.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "zona-chef",
    nombre: "Zona Chef",
    emoji: "👨‍🍳",
    descripcion: "Sección dedicada en el front con fotos y videos de los platos más ricos. Landing page por plato/trago/torta.",
    fase: "F3", inicioD: 57, finD: 100,
    tareas: [
      { id: "zc01", nombre: "Sección Chef en el front", descripcion: "Zona destacada con fotos y videos de los platos estrella del bar/cafetería.", estado: "pendiente", prioridad: "alta" },
      { id: "zc02", nombre: "Landing page por plato/trago/torta", descripcion: "Cada ítem del menú puede tener su propia página con historia, foto, video y CTA.", estado: "pendiente", prioridad: "alta" },
      { id: "zc03", nombre: "Admin — gestionar fotos y videos por ítem", descripcion: "Cada producto del menú tiene: foto principal, galería, video, descripción extendida.", estado: "pendiente", prioridad: "alta" },
      { id: "zc04", nombre: "Auto-tarea al agregar producto a la carta", descripcion: "Al crear nuevo ítem en el menú → generar tarea: hacer fotos, hacer video, actualizar catastro.", estado: "pendiente", prioridad: "media" },
      { id: "zc05", nombre: "SEO por plato — URLs amigables", descripcion: "cachocabrabar.cl/chef/gin-barbie — indexable por Google.", estado: "pendiente", prioridad: "baja" },
    ],
  },
  {
    id: "fidelizacion",
    nombre: "Fidelización / SVA",
    emoji: "👥",
    descripcion: "Meta: 200 clientes en 90 días. Programa cumpleaños, historial, categorización, zona VIP cenas clandestinas.",
    fase: "F3", inicioD: 57, finD: 130,
    tareas: [
      { id: "fi01", nombre: "Captura de email en checkout / fila de espera", descripcion: "Campo opcional con incentivo: 10% de descuento en próxima visita.", estado: "pendiente", prioridad: "alta" },
      { id: "fi02", nombre: "Cupón automático por registro", descripcion: "Código único de 10% enviado por correo al registrarse.", estado: "pendiente", prioridad: "alta" },
      { id: "fi03", nombre: "Programa de cumpleaños", descripcion: "Postre o trago de cortesía el mes del cumpleaños — automatizado.", estado: "pendiente", prioridad: "media" },
      { id: "fi04", nombre: "Categorización de clientes", descripcion: "Casual / Regular / VIP según frecuencia y consumo. Clasificación automática.", estado: "pendiente", prioridad: "media" },
      { id: "fi05", nombre: "Alerta clientes inactivos", descripcion: "Si un habitual lleva 3+ semanas sin visita, alertar al equipo.", estado: "pendiente", prioridad: "baja" },
      { id: "fi06", nombre: "Comunicación segmentada", descripcion: "Envío diferenciado por segmento: promos para Casual, invitaciones VIP para Premium.", estado: "pendiente", prioridad: "media" },
    ],
  },
  {
    id: "turismo",
    nombre: "Campaña Turística",
    emoji: "🗺️",
    descripcion: "Posicionar Cacho Cabra en Santiago como destino de fin de semana. Ruta Costa, turista RM.",
    fase: "F3", inicioD: 69, finD: 130,
    tareas: [
      { id: "tu01", nombre: "Campaña Ruta Costa — targeting Santiago", descripcion: "Posicionar el bar en RM: 'el mejor ceviche, pil-pil o sushi de la zona costera'.", estado: "pendiente", prioridad: "alta" },
      { id: "tu02", nombre: "Contenido enfocado en turismo", descripcion: "Reels y posts mostrando el viaje: llegar a Llolleo, la plaza, el local, la experiencia.", estado: "pendiente", prioridad: "alta" },
      { id: "tu03", nombre: "Aniversario Cacho Cabra (04 Sep)", descripcion: "Fiesta privada de aniversario — Jueves. Contenido de celebración 2 semanas antes.", estado: "pendiente", prioridad: "media" },
      { id: "tu04", nombre: "Fiesta de Apertura / Halloween (30 Oct)", descripcion: "Jueves de gala — Fiesta de Máscaras. Conecta con fin de semana de Halloween.", estado: "pendiente", prioridad: "media" },
    ],
  },
];

const VER = "v2";

// ── helpers ──
function daysFromJun23(date: Date): number {
  const base = new Date(2026, 5, 23); // Jun 23
  return Math.round((date.getTime() - base.getTime()) / 86400000);
}

export default function AnalisisPage() {
  const [modulos, setModulos]   = useState<Modulo[]>(MODULOS_BASE);
  const [vista, setVista]       = useState<Vista>("lista");
  const [abierto, setAbierto]   = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const key = `cacho-marketing-${VER}`;

  useEffect(() => {
    const s = localStorage.getItem(key);
    if (s) { try { setModulos(JSON.parse(s)); } catch { /**/ } }
  }, [key]);

  function guardar(ms: Modulo[]) {
    setModulos(ms);
    localStorage.setItem(key, JSON.stringify(ms));
  }

  function cambiarEstado(mId: string, tId: string, est: Estado) {
    guardar(modulos.map(m => m.id !== mId ? m : {
      ...m,
      tareas: m.tareas.map(t => t.id !== tId ? t : { ...t, estado: est }),
    }));
  }

  const allT      = modulos.flatMap(m => m.tareas);
  const completadas = allT.filter(t => t.estado === "completado").length;
  const enProgreso  = allT.filter(t => t.estado === "en-progreso").length;
  const total       = allT.length;
  const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const urgentes    = allT.filter(t => t.prioridad === "urgente" && t.estado !== "completado");

  const filtered = search
    ? modulos.map(m => ({
        ...m,
        tareas: m.tareas.filter(t =>
          t.nombre.toLowerCase().includes(search.toLowerCase()) ||
          t.descripcion.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(m => m.tareas.length > 0)
    : modulos;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: TEXT1 }}>

      {/* HEADER */}
      <header className="ws-header" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="ws-header-inner" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <Image src="/LogoCachoEcabra.png" alt="Cacho Cabra" width={140} height={109} loading="eager" />
            <div className="ws-header-right" style={{ textAlign: "right" }}>
              <div className="ws-header-title" style={{ fontFamily: TITLE, fontSize: 30, fontWeight: 900, color: TEXT1, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Plan de Marketing
              </div>
              <div style={{ fontSize: 15, color: TEXT3, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {VER} · junio 2026 · 3 meses
              </div>
            </div>
          </div>
          <div className="ws-header-chips" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Bar · Restaurante · Cafetería", "Plaza de Llolleo, San Antonio", "3 meses · 10 módulos"].map((l, i) => (
              <span key={l} className="ws-header-chip" style={{
                fontSize: 16, fontWeight: 500,
                color: i === 2 ? AMR : TEXT2,
                background: SURFACE,
                border: `1px solid ${i === 2 ? "#78530a" : BORDER}`,
                borderRadius: 999, padding: "6px 16px",
              }}>{l}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="ws-main" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48 }}>

        {/* STATS */}
        <div className="ws-stats">
          {[
            { num: `${pct}%`,    label: "Completado",     color: TEXT1    },
            { num: completadas,  label: "Completadas",    color: TEXT1    },
            { num: enProgreso,   label: "En progreso",    color: AMR      },
            { num: total,        label: "Tareas totales", color: TEXT2    },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 22px" }}>
              <div className="ws-stats-num" style={{ fontFamily: TITLE, fontSize: "clamp(2rem,4vw,3.4rem)", fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>
                {s.num}
              </div>
              <div style={{ fontSize: 14, color: TEXT3, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 10 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* PROGRESO */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: TEXT2 }}>Progreso global</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: TEXT2 }}>{completadas}/{total}</span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div style={{ height: "100%", width: `${pct}%`, background: AMR, borderRadius: 99, transition: "width 0.7s ease" }} />
          </div>
        </div>

        {/* URGENTES */}
        {urgentes.length > 0 && (
          <div className="ws-urgente" style={{ background: "#231515", border: `1px solid #6b2020`, borderLeft: `4px solid ${ROJO}`, borderRadius: 16, padding: 28 }}>
            <div className="ws-urgente-title" style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 900, color: ROJO, marginBottom: 18 }}>
              🚨 {urgentes.length} tareas urgentes sin completar
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {urgentes.map(t => (
                <div key={t.id} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 3, borderRadius: 99, background: "#7f1d1d", flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#fecaca", marginBottom: 3 }}>{t.nombre}</div>
                    <div style={{ fontSize: 16, color: "#fca5a5", lineHeight: 1.6 }}>{t.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB NAV */}
        <div className="ws-tab-bar" style={{ display: "flex", gap: 6, padding: "4px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, alignSelf: "flex-start" }}>
          {(["lista", "kanban", "gantt"] as Vista[]).map(v => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                fontFamily: FONT, fontSize: 16, fontWeight: 600,
                padding: "9px 22px", borderRadius: 10, border: "none", cursor: "pointer",
                background: vista === v ? AMR : "transparent",
                color: vista === v ? "#1a1200" : TEXT3,
                transition: "all 0.15s",
                textTransform: "capitalize",
              }}
            >
              {v === "lista" ? "📋 Lista" : v === "kanban" ? "⬛ Kanban" : "📊 Gantt"}
            </button>
          ))}
        </div>

        {/* ── VISTA LISTA ── */}
        {vista === "lista" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <input
              type="text" placeholder="Buscar tarea..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`,
                borderRadius: 12, padding: "14px 20px", fontSize: 17,
                fontFamily: FONT, color: TEXT1, outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => (e.target.style.borderColor = AMR)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(modulo => {
                const mDone = modulo.tareas.filter(t => t.estado === "completado").length;
                const mPct  = modulo.tareas.length > 0 ? Math.round((mDone / modulo.tareas.length) * 100) : 0;
                const open  = abierto === modulo.id || !!search;
                const hayUrg = modulo.tareas.some(t => t.prioridad === "urgente" && t.estado !== "completado");
                const done  = mDone === modulo.tareas.length && modulo.tareas.length > 0;
                const accent = hayUrg ? ROJO : done ? VERDE : BORDER;

                return (
                  <div key={modulo.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${accent}`, borderRadius: 16, overflow: "hidden" }}>
                    <button
                      onClick={() => !search && setAbierto(open && !search ? null : modulo.id)}
                      style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 28 }}>{modulo.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontFamily: TITLE, fontSize: 21, fontWeight: 800, color: TEXT1 }}>{modulo.nombre}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: FASE_COLOR[modulo.fase], background: SURF2, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.06em" }}>
                            {modulo.fase}
                          </span>
                        </div>
                        <div style={{ fontSize: 16, color: TEXT2 }}>{modulo.descripcion}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, color: done ? VERDE : TEXT2 }}>{mPct}%</div>
                        <div style={{ fontSize: 14, color: TEXT3 }}>{mDone}/{modulo.tareas.length}</div>
                      </div>
                      {!search && <span style={{ color: TEXT3, fontSize: 16 }}>{open ? "↑" : "↓"}</span>}
                    </button>
                    <div style={{ height: 3, background: SURF2 }}>
                      <div style={{ height: "100%", width: `${mPct}%`, background: done ? VERDE : accent === ROJO ? ROJO : "#6b6560", transition: "width 0.5s" }} />
                    </div>
                    {open && (
                      <div style={{ padding: "8px 16px 16px" }}>
                        {modulo.tareas.map((tarea, idx) => {
                          const est  = ESTADOS.find(e => e.value === tarea.estado)!;
                          const prio = tarea.prioridad ? PRIO[tarea.prioridad] : null;
                          const isEd = editando === tarea.id;
                          return (
                            <div key={tarea.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 12px", borderRadius: 10, borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}
                              onMouseEnter={e => (e.currentTarget.style.background = SURF2)}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <div style={{ width: 9, height: 9, borderRadius: 99, background: est.dot, flexShrink: 0, marginTop: 6 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                  <span style={{ fontSize: 17, fontWeight: 700, color: TEXT1 }}>{tarea.nombre}</span>
                                  {prio && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${prio.tag}`}>{prio.label}</span>}
                                </div>
                                <div style={{ fontSize: 16, color: TEXT2, lineHeight: 1.65 }}>{tarea.descripcion}</div>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                {isEd ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                                    {ESTADOS.map(e => (
                                      <button key={e.value} onClick={() => { cambiarEstado(modulo.id, tarea.id, e.value); setEditando(null); }}
                                        className={`${e.tag} text-xs font-semibold px-3 py-1.5 rounded-full`}
                                        style={{ whiteSpace: "nowrap", fontFamily: FONT, border: "none", cursor: "pointer" }}>
                                        {e.label}
                                      </button>
                                    ))}
                                    <button onClick={() => setEditando(null)} style={{ fontSize: 14, color: TEXT3, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>cancelar</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setEditando(tarea.id)}
                                    className={`${est.tag} text-xs font-semibold px-3 py-1.5 rounded-full`}
                                    style={{ whiteSpace: "nowrap", fontFamily: FONT, border: "none", cursor: "pointer" }}>
                                    {est.label}
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
          </div>
        )}

        {/* ── VISTA KANBAN ── */}
        {vista === "kanban" && (
          <div style={{ overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" as never }}>
            <div className="ws-kanban" style={{ display: "grid", gridTemplateColumns: "repeat(5, 260px)", gap: 12, minWidth: 1360 }}>
              {ESTADOS.map(col => {
                const cards = modulos.flatMap(m =>
                  m.tareas
                    .filter(t => t.estado === col.value)
                    .map(t => ({ ...t, modulo: m }))
                );
                return (
                  <div key={col.value}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" }}>
                      <div style={{ width: 9, height: 9, borderRadius: 99, background: col.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.label}</span>
                      <span style={{ fontSize: 14, color: TEXT3, marginLeft: "auto" }}>{cards.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {cards.length === 0 && (
                        <div style={{ background: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", color: TEXT3, fontSize: 15 }}>
                          Sin tareas
                        </div>
                      )}
                      {cards.map(card => {
                        const prio = card.prioridad ? PRIO[card.prioridad] : null;
                        return (
                          <div key={card.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${FASE_COLOR[card.modulo.fase]}`, borderRadius: 12, padding: "14px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>{card.modulo.emoji}</span>
                              <span style={{ fontSize: 13, color: TEXT3, fontWeight: 600, letterSpacing: "0.05em" }}>{card.modulo.nombre}</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT1, lineHeight: 1.4, marginBottom: 6 }}>{card.nombre}</div>
                            <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.55, marginBottom: 10 }}>{card.descripcion}</div>
                            {prio && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prio.tag}`}>{prio.label}</span>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                              {ESTADOS.filter(e => e.value !== card.estado).map(e => (
                                <button key={e.value} onClick={() => cambiarEstado(card.modulo.id, card.id, e.value)}
                                  style={{ fontSize: 13, color: TEXT3, background: SURF2, border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: FONT }}>
                                  → {e.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VISTA GANTT ── */}
        {vista === "gantt" && (
          <div>
            <div style={{ fontFamily: TITLE, fontSize: 24, fontWeight: 800, color: TEXT1, marginBottom: 24 }}>
              Programación Jun — Oct 2026
            </div>
            {/* Leyenda fases */}
            <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
              {[["F1", "Plan Choque", ROJO], ["F2", "Lanzamiento", AMR], ["F3", "Expansión", TEXT2]].map(([f, l, c]) => (
                <div key={f as string} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 10, borderRadius: 4, background: c as string, opacity: 0.85 }} />
                  <span style={{ fontSize: 15, color: TEXT2 }}>{f} · {l}</span>
                </div>
              ))}
            </div>
            {/* Header meses */}
            <div className="ws-gantt-hdr" style={{ position: "relative", marginBottom: 4, height: 28 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "100%", display: "flex" }}>
                {MESES.map(m => (
                  <div key={m.label} className="ws-gantt-hdr-item" style={{
                    position: "absolute",
                    left: `${(m.d / T_TOTAL) * 100}%`,
                    fontSize: 13, fontWeight: 700, color: TEXT3, letterSpacing: "0.1em",
                    borderLeft: `1px solid ${BORDER}`, paddingLeft: 6, lineHeight: "28px",
                    width: 60,
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
            {/* Filas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {modulos.map(m => {
                const mDone = m.tareas.filter(t => t.estado === "completado").length;
                const allDone = mDone === m.tareas.length;
                const fColor = allDone ? VERDE : FASE_COLOR[m.fase];
                const barW  = ((m.finD - m.inicioD) / T_TOTAL) * 100;
                const barL  = (m.inicioD / T_TOTAL) * 100;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 0, height: 44 }}>
                    {/* Label */}
                    <div className="ws-gantt-label" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, paddingRight: 12 }}>
                      <span className="ws-gantt-emoji" style={{ fontSize: 19 }}>{m.emoji}</span>
                      <div>
                        <div className="ws-gantt-label-name" style={{ fontSize: 15, fontWeight: 600, color: TEXT1, lineHeight: 1.2 }}>{m.nombre}</div>
                        <div className="ws-gantt-label-sub" style={{ fontSize: 13, color: TEXT3 }}>{mDone}/{m.tareas.length}</div>
                      </div>
                    </div>
                    {/* Bar track */}
                    <div style={{ flex: 1, position: "relative", height: "100%", background: SURFACE, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      {/* Month grid lines */}
                      {MESES.map(mes => (
                        <div key={mes.label} style={{
                          position: "absolute", left: `${(mes.d / T_TOTAL) * 100}%`,
                          top: 0, bottom: 0, width: 1, background: BORDER, opacity: 0.4,
                        }} />
                      ))}
                      {/* Progress bar */}
                      <div style={{
                        position: "absolute",
                        left: `${barL}%`,
                        width: `${barW}%`,
                        top: "20%", height: "60%",
                        background: fColor,
                        opacity: allDone ? 1 : 0.75,
                        borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: allDone ? "#111" : "#1a1200",
                        overflow: "hidden", whiteSpace: "nowrap",
                        transition: "opacity 0.3s",
                      }}>
                        {barW > 12 && `${Math.round((mDone / m.tareas.length) * 100)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Hitos clave */}
            <div style={{ marginTop: 36 }}>
              <div style={{ fontFamily: TITLE, fontSize: 20, fontWeight: 800, color: TEXT1, marginBottom: 16 }}>Hitos clave</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { d: 8,   label: "01 Jul — Cena Italiana (inicio ciclo invierno)",    color: AMR  },
                  { d: 13,  label: "06 Jul — 1ª Cena Clandestina",                       color: ROJO },
                  { d: 28,  label: "21 Jul — Lanzamiento Web App F1",                    color: AMR  },
                  { d: 41,  label: "03 Ago — 2ª Cena Clandestina",                       color: ROJO },
                  { d: 69,  label: "31 Ago — 3ª Cena Clandestina",                       color: ROJO },
                  { d: 73,  label: "04 Sep — Aniversario Cacho Cabra",                   color: TEXT2 },
                  { d: 129, label: "30 Oct — Fiesta de Apertura · Halloween",            color: TEXT2 },
                ].map(h => (
                  <div key={h.d} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div className="ws-gantt-label" style={{ flexShrink: 0, paddingRight: 12 }}></div>
                    <div style={{ flex: 1, position: "relative", height: 28 }}>
                      <div style={{
                        position: "absolute",
                        left: `calc(${(h.d / T_TOTAL) * 100}% - 5px)`,
                        top: "50%", transform: "translateY(-50%)",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: 99, background: h.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: TEXT2, whiteSpace: "nowrap" }}>{h.label}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={{ textAlign: "center", paddingBottom: 48, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 15, color: TEXT3, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Cacho &amp; Cabra · Plan de Marketing · cúbicos · {VER} · 2026
          </div>
        </footer>
      </div>
    </div>
  );
}
