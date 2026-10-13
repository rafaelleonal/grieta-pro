import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import { APP_THEME_COLOR } from "@/lib/design-tokens";
import "./globals.css";
import "@/components/ui.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elociencia — La ciencia de subir de elo",
  description:
    "Tu coach de League of Legends con IA. Matchups, niveles 1 a 6, mecánicas y builds con contexto de tu partida.",
  openGraph: {
    title: "Elociencia — La ciencia de subir de elo",
    description: "Coach de League of Legends en español. No avalado por Riot Games.",
    siteName: "Elociencia",
    locale: "es_MX",
    type: "website",
  },
  robots: { index: false, follow: false },
  applicationName: "Elociencia",
  appleWebApp: { capable: true, title: "Elociencia", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: APP_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Fresh request rendering lets Next attach the proxy's nonce to its scripts.
  await connection();
  return (
    <html lang="es-MX" data-scroll-behavior="smooth">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
