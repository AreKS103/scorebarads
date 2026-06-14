import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Score Ads Manager",
  description: "Private Google Ads campaign dashboard for Score Sports Bar & Grill, Phnom Penh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
