import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ezra Bid Assistant API",
  description: "Backend for the Ezra Bid Assistant Chrome Extension.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
