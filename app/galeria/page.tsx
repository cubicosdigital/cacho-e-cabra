import { getSupabase } from "../../lib/supabase";
import type { GaleriaItem } from "../../lib/galeria";
import GaleriaClient from "./GaleriaClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galería · Cacho Cabra",
  description: "Fotos y videos de Cacho Cabra: aniversario, la carta y más momentos del local.",
};

async function getGaleria(): Promise<GaleriaItem[]> {
  const { data, error } = await getSupabase()
    .from("galeria_items")
    .select("*")
    .eq("activo", true)
    .order("tipo", { ascending: true })
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });
  if (error || !data) return [];
  return data as GaleriaItem[];
}

export default async function GaleriaPage() {
  const items = await getGaleria();
  return <GaleriaClient items={items} />;
}
