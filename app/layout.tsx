import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LatentLearn",
  description: "A conversation-first learning companion with a memory tree."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
