import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  variable: "--font-poppins",
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const THEME_SCRIPT = `try{var t=localStorage.getItem("easyd-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#00510f" }, { media: "(prefers-color-scheme: dark)", color: "#08100c" }] };

export const metadata: Metadata = {
  title: "Easy D",
  description: "Easy D business management platform",
  appleWebApp: { capable: true, title: "Easy D", statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
