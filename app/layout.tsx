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

export const metadata: Metadata = {
  title: "Cacho Cabra — Workspace",
  description: "Plan de marketing, desarrollo y medios",
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
