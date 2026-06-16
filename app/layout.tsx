import type { Metadata } from "next";
import { IdleSessionTimeout } from "@/components/shared/IdleSessionTimeout";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('score.theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <IdleSessionTimeout />
        <ThemeToggle />
      </body>
    </html>
  );
}
