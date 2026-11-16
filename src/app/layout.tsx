import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Archivo } from "next/font/google";
import "./globals.css";

// Slab display type borrowed from smokehouse signage; Archivo (with its width axis)
// carries body copy and the condensed order-ticket numerals.
const display = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-slab",
  display: "swap",
});

const body = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spread",
  description:
    "Plan your party: guest list, RSVPs, and how much food to make. No accounts for guests.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EFD3C1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full bg-cream antialiased ${display.variable} ${body.variable}`}>
      <body className="flex min-h-full flex-col bg-cream font-body text-ink">
        {children}
      </body>
    </html>
  );
}
