import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EsteticaProHub - Red Social para Profesionales de la Estética",
  description: "Plataforma exclusiva para profesionales de la estética. Comparte conocimientos, casos de éxito, técnicas innovadoras y conecta con expertos en belleza, spa, medicina estética y wellness.",
  keywords: ["estética", "belleza", "spa", "medicina estética", "profesionales", "red social", "técnicas", "tratamientos"],
  authors: [{ name: "EsteticaProHub" }],
  creator: "EsteticaProHub",
  publisher: "EsteticaProHub",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    title: "EsteticaProHub - Red Social para Profesionales de la Estética",
    description: "Plataforma exclusiva para profesionales de la estética. Comparte conocimientos, casos de éxito y conecta con expertos.",
    siteName: "EsteticaProHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "EsteticaProHub - Red Social para Profesionales de la Estética",
    description: "Plataforma exclusiva para profesionales de la estética. Comparte conocimientos, casos de éxito y conecta con expertos.",
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <NotificationsProvider>
            <Header />
            {children}
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}