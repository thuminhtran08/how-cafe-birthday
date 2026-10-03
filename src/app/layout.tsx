import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const cdaIndependence = localFont({
  src: "./fonts/CDAIndependenceText-Medium.otf",
  variable: "--font-cda",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HOW Café – Happy Birthday 6th",
  description: "HOW Café Happy Birthday 6 tuổi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={cdaIndependence.variable}>{children}</body>
    </html>
  );
}
