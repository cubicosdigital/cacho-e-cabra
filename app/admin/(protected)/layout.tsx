import { redirect } from "next/navigation";
import { supabaseServer } from "../../../lib/supabase-server";
import Sidebar, { Rol } from "./Sidebar";
import { BG } from "../../../lib/tokens";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminUser } = await supabase
    .from("usuarios_admin")
    .select("nombre, rol, activo")
    .eq("email", user.email!)
    .maybeSingle();

  if (!adminUser || !adminUser.activo) redirect("/admin/login");

  const nombre = adminUser.nombre || user.email!.split("@")[0];
  const rol = adminUser.rol as Rol;

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex" }}>
      <Sidebar nombre={nombre} rol={rol} />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
