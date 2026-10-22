import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "FindIt Campus | Recupera lo que perdiste en tu campus",
    template: "%s | FindIt Campus",
  },
  description:
    "FindIt Campus es la plataforma institucional para registrar, encontrar y recuperar objetos perdidos en tu campus, con custodia centralizada y trazabilidad.",
  applicationName: "FindIt Campus",
  keywords: [
    "objetos perdidos",
    "campus",
    "universidad",
    "Cartagena",
    "recuperar objetos",
  ],
  openGraph: {
    title: "FindIt Campus | Recupera lo que perdiste en tu campus",
    description:
      "La plataforma institucional para registrar, encontrar y recuperar objetos perdidos en tu campus, con custodia centralizada y trazabilidad.",
    siteName: "FindIt Campus",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
