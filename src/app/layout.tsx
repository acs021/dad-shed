import type { Metadata, Viewport } from "next";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dad Shed", template: "%s · Dad Shed" },
  description: "A private neighborhood library for borrowing tools and gear.",
  robots: { index: false, follow: false },
  applicationName: "Dad Shed",
};

export const viewport: Viewport = {
  themeColor: "#1c3b30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
