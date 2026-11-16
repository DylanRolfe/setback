import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";

// Archivo is downloaded when the site is built and served from this site's own
// files. The browser never contacts a font service.
// One family, two widths: normal for reading, condensed for headings and figures.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Setback: heating schedule energy and CO2e simulator",
  description: "Setback: see what your thermostat schedule costs in energy and CO2e",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#17252f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
