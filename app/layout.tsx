import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Like That - Reference Review",
  description: "Swipe-based reference review app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
