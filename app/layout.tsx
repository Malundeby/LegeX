import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import PageViewTracker from "./components/PageViewTracker";
import AccountBar from "./components/AccountBar";
import { PREFS_INIT_SCRIPT } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Legeassistent",
  description: "Kliniske verktøy for rask bruk i konsultasjon.",
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#b5573f"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_INIT_SCRIPT }} />
        <meta name="application-name" content="Legeassistent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Legeassistent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <PageViewTracker />
        <AccountBar />
        {children}
      </body>
    </html>
  );
}
