import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ToppenLS",
  description: "Kliniske verktøy for rask bruk i konsultasjon.",
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#0f62fe"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <head>
        <meta name="application-name" content="ToppenLS" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ToppenLS" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
