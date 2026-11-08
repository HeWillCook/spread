import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cookout",
  description:
    "Plan your party: guest list, RSVPs, and how much food to make. No accounts for guests.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF4DC",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full bg-cream antialiased">
      <body className="flex min-h-full flex-col bg-cream font-body text-ink">
        {children}
      </body>
    </html>
  );
}
