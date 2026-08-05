import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/shared/ui/toast";
import "./globals.css";

// Misma familia y pesos que index.html carga de Google Fonts (~5-6):
// Inter 400/500/600/700. next/font la autohospeda (sin la llamada externa
// a fonts.googleapis.com), mismo resultado visual.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Portadas Personalizadas | GOR FACTORY (desarrollo)",
  description:
    "Entorno de desarrollo de la migración a Next.js — no es producción. Ver docs/06-roadmap.md.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
