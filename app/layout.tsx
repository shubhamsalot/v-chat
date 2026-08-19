import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "V-Chat — 1:1 Live Video WebRTC Chat",
  description:
    "Connect with random strangers worldwide for live 1:1 WebRTC video conversations. Strict safety, age-verification, and automated moderation.",
  keywords: ["WebRTC", "Video Chat", "1:1 Stranger Chat", "Next.js 14", "Firebase"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0D0D0F" />
      </head>
      <body className="min-h-screen bg-background text-text selection:bg-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
