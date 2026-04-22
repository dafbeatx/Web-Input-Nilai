import type { Metadata } from "next";
import { Inter, Outfit, Amiri, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const amiri = Amiri({ 
  weight: ["400", "700"], 
  subsets: ["arabic"], 
  variable: "--font-amiri" 
});


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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${amiri.variable} ${manrope.variable} font-sans text-slate-900 antialiased selection:bg-primary/30 flex flex-col min-h-dvh`}>
        <StarBackground />

        <ErrorBoundary>
          <GradeMasterProvider>
            <Navbar />
            <main className="relative flex-1">
              {children}
            </main>
          </GradeMasterProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
