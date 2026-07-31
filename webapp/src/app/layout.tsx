import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portadas Personalizadas | GOR FACTORY (desarrollo)",
  description:
    "Entorno de desarrollo de la migración a Next.js — no es producción. Ver docs/06-roadmap.md.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
