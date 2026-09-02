import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carta · Cacho Cabra",
  description: "Comida, tragos y cafetería de Cacho Cabra. Pide directo desde tu mesa.",
  openGraph: {
    title: "Carta · Cacho Cabra",
    description: "Comida, tragos y cafetería de Cacho Cabra. Pide directo desde tu mesa.",
    url: "https://cachocabrabar.cl/carta",
    siteName: "Cacho Cabra",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carta · Cacho Cabra",
    description: "Comida, tragos y cafetería de Cacho Cabra. Pide directo desde tu mesa.",
  },
};

export default function CartaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
