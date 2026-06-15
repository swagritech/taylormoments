import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import {
  Cinzel,
  Cormorant_Garamond,
  Inter,
  Noto_Serif,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";
import "./globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});

const editorial = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  preload: false,
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  preload: false,
});

// Vietnamese display face. Noto Serif renders stacked diacritics (ắ/ế) correctly
// at every weight; we route the vi display/heading type to it with NO Georgia or
// generic-serif fallback ahead of it (those break VN shaping). See the design
// handoff ROLLOUT_NUANCES — this is the documented Vietnamese trap.
const notoSerifVi = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  preload: false,
});

// Simplified Chinese faces (serif for display, sans for body/UI).
const notoSerifSc = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  weight: ["400", "500", "600"],
  preload: false,
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  weight: ["300", "400", "500", "600"],
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
      <body
        className={`${display.variable} ${editorial.variable} ${sans.variable} ${notoSerifVi.variable} ${notoSerifSc.variable} ${notoSansSc.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
