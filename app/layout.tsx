import type { Metadata } from "next";
import { Raleway, DM_Sans } from "next/font/google";
import Header from "./Header";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const titulo = "Cacho Cabra 🐐 Café de día, bar de noche";
const descripcion = "Cafetería, brunch, comida y tragos en el corazón de la Plaza de Llolleo, San Antonio. Ven a conocernos.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cachocabrabar.cl"),
  title: titulo,
  description: descripcion,
  openGraph: {
    title: titulo,
    description: descripcion,
    url: "https://cachocabrabar.cl",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${raleway.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: "#2d2b27" }}>
        <Header />
        {children}
      </body>
    </html>
  );
}
