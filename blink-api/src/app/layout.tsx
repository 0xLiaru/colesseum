import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proof of Dare - Dashboard",
  description: "Meydan okumalarını yönet ve SOL kazan!",
};

import PrivyWrapper from "@/components/PrivyProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body className="min-h-full flex flex-col bg-[#020617]">
        <PrivyWrapper>
          {children}
        </PrivyWrapper>
      </body>
    </html>
  );
}
