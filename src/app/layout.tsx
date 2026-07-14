import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "GradeMaster OS - DFBX",
  description: "Advanced grading and educational assistance platform",
  icons: {
    icon: "/favicon.png",
  },
};

import { GradeMasterProvider } from '@/context/GradeMasterContext';
import Navbar from '@/components/grademaster/Navbar';
import StarBackground from '@/components/grademaster/ui/StarBackground';
import ErrorBoundary from '@/components/ErrorBoundary';
import SafeStorageScript from '@/components/SafeStorageScript';
import AICopilot from '@/components/grademaster/AICopilot';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GradeMaster" />
        <meta name="theme-color" content="#090d16" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@100..900&family=Manrope:wght@200..800&family=Outfit:wght@100..900&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="font-sans text-slate-900 antialiased selection:bg-primary/30 flex flex-col min-h-dvh">
        <SafeStorageScript />
        <StarBackground />

        <ErrorBoundary>
          <GradeMasterProvider>
            <Navbar />
            <main className="relative flex-1 main-content-wrapper">
              {children}
            </main>
            <AICopilot />
          </GradeMasterProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
