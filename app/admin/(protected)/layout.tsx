import { redirect } from "next/navigation";
import type { Viewport } from "next";
import { supabaseServer } from "../../../lib/supabase-server";
import Sidebar, { Rol } from "./Sidebar";
import MobileNav from "./MobileNav";
import AdminNavProvider from "./AdminNavProvider";
import { BG } from "../../../lib/tokens";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Clases de apoyo para que las páginas del admin se adapten al celular (< 768px).
 * Las páginas usan estilos en línea, así que lo que tiene que cambiar en móvil lleva !important.
 */
const CSS_RESPONSIVE = `
.adm-page { padding: 32px 40px; }
.adm-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
.adm-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
@media (max-width: 767px) {
  .adm-page { padding: 16px 14px !important; }
  .adm-h1 { font-size: 24px !important; }
  .adm-stack { flex-direction: column !important; align-items: stretch !important; }
  .adm-full { width: 100% !important; min-width: 0 !important; max-width: 100% !important; flex: 1 1 100% !important; }
  .adm-hide-mobile { display: none !important; }
  .adm-grid-1 { grid-template-columns: minmax(0, 1fr) !important; }
  .adm-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .adm-modal { width: calc(100vw - 24px) !important; max-width: calc(100vw - 24px) !important; max-height: 90vh; overflow-y: auto; }
  .adm-sticky-bottom { bottom: calc(70px + env(safe-area-inset-bottom)) !important; }
  main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  main select, main textarea { font-size: 16px !important; }
  main button, main select { min-height: 38px; }
}
`;

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminUser } = await supabase
    .from("usuarios_admin")
    .select("id, nombre, rol, activo, permisos")
    .eq("email", user.email!)
    .maybeSingle();

  if (!adminUser || !adminUser.activo) redirect("/admin/login");

  const nombre = adminUser.nombre || user.email!.split("@")[0];
  const rol = adminUser.rol as Rol;
  // Quien está en art. 22 no tiene turnos: se le oculta ese menú.
  const { data: ficha } = await supabase.from("empleados").select("jornada_tipo").eq("usuario_admin_id", adminUser.id).maybeSingle();
  const permisos = { ...(adminUser.permisos ?? {}), ...(ficha?.jornada_tipo === "art22" ? { sin_turnos: true } : {}) };

  return (
    <AdminNavProvider nombre={nombre} rol={rol} permisos={permisos}>
      <style>{CSS_RESPONSIVE}</style>
      <div className="flex flex-col md:flex-row" style={{ minHeight: "100vh", background: BG }}>
        <Sidebar nombre={nombre} rol={rol} permisos={permisos} />
        <MobileNav />
        <main className="pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0" style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </AdminNavProvider>
  );
}
