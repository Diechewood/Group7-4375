import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Frosted Fabrics",
  description: "Inventory management for Frosted Fabrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col min-h-screen">
          <Header />
          <div className="flex flex-1 pt-16">
            <Sidebar />
            <main className="flex-1 ml-64 p-6 bg-[#F3F0E9] min-h-[calc(100vh-4rem)]">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}