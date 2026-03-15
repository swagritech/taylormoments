import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Tailor Moments | Your Way",
  description:
    "Tailor Moments is a premium Margaret River booking platform for curated winery visits, transport coordination, and partner approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
