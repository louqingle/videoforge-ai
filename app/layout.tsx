import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoForge AI",
  description: "Turn an idea into an AI video."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
