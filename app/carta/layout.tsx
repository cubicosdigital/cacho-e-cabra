import type { Metadata } from "next";

const titulo = "La Carta 🐐 Cacho Cabra";
const descripcion = "Hamburguesas, tragos de autor y la mejor cafetería de San Antonio. Mira la carta completa y elige lo tuyo.";

export const metadata: Metadata = {
  title: titulo,
  description: descripcion,
  openGraph: {
    title: titulo,
    description: descripcion,
    url: "https://cachocabrabar.cl/carta",
    siteName: "Cacho Cabra",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: titulo,
    description: descripcion,
  },
};

export default function CartaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
