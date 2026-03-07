import type { Metadata } from "next";
import { Inter, Outfit, Amiri } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${outfit.variable} ${amiri.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
