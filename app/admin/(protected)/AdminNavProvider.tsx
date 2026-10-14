"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Rol } from "../../../lib/roles";
import type { PermisosGuardados } from "../../../lib/permisos";
import type { Badge } from "./nav-config";

type Contadores = Record<Badge, number>;
type Valor = { nombre: string; rol: Rol; permisos: PermisosGuardados; contadores: Contadores };

const Ctx = createContext<Valor | null>(null);

export function useAdminNav() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminNav debe usarse dentro de AdminNavProvider");
  return v;
}

export default function AdminNavProvider({ nombre, rol, permisos, children }: {
  nombre: string; rol: Rol; permisos: PermisosGuardados; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [contadores, setContadores] = useState<Contadores>({ pedidosNuevos: 0, deliveryNuevos: 0, notificaciones: 0 });

  useEffect(() => {
    let vivo = true;
    async function contar() {
      try {
        const [rPedidos, rDelivery, rNotif] = await Promise.all([
          fetch("/api/pedidos"),
          fetch("/api/delivery"),
          rol === "admin" ? fetch("/api/notificaciones?contar=1") : Promise.resolve(null),
        ]);
        if (!vivo) return;
        const nuevos = (data: unknown) =>
          Array.isArray(data) ? data.filter((p: { estado: string }) => p.estado === "recibido").length : 0;
        setContadores({
          pedidosNuevos: rPedidos.ok ? nuevos(await rPedidos.json()) : 0,
          deliveryNuevos: rDelivery.ok ? nuevos(await rDelivery.json()) : 0,
          notificaciones: rNotif?.ok ? (await rNotif.json()).no_leidas ?? 0 : 0,
        });
      } catch {
        /* el contador es informativo: si falla, se queda como está */
      }
    }
    contar();
    const t = setInterval(contar, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [pathname, rol]);

  return <Ctx.Provider value={{ nombre, rol, permisos, contadores }}>{children}</Ctx.Provider>;
}
