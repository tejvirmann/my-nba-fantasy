import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { accentVars } from "@/core/color";
import { getUserOrNull } from "@/server/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "DS Hoops League",
  description: "A private fantasy basketball league with Lock-In scoring.",
  appleWebApp: { capable: true, title: "DS Hoops League", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  themeColor: "#0c8312",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();
  return (
    <html lang="en" className={inter.variable} style={accentVars(user?.accentColor) as React.CSSProperties}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
