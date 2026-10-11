import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrietaPro — Tu plan para la Grieta",
  description:
    "Tu coach de League of Legends con IA. Matchups, niveles 1 a 6, mecánicas y builds con contexto de tu partida.",
  robots: { index: false, follow: false },
  applicationName: "GrietaPro",
  appleWebApp: { capable: true, title: "GrietaPro", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = {
  themeColor: "#0c0e13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Fresh request rendering lets Next attach the proxy's nonce to its scripts.
  await connection();
  return (
    <html lang="es-MX" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
