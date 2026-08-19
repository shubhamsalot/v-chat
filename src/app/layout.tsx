import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "V-Chat — 1:1 Random Video & Text Chat",
  description: "Connect instantly with strangers across the world via 1:1 encrypted WebRTC video chat. Age-gated, moderated, and ephemeral.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0D0D0F] text-[#F2F2F0] antialiased selection:bg-[#FF4B2B] selection:text-white">
        {children}
      </body>
    </html>
  );
}
