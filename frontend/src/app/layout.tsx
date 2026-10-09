import type { Metadata } from "next";
import { Inter, Karla, Montserrat, Playfair_Display, Source_Sans_3, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Theme fonts. Each exposes a CSS variable that lib/theme.ts maps theme.font onto.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Typeform",
  description: "People-friendly forms and surveys",
};

// Applies the saved admin theme before first paint so dark mode doesn't flash.
const themeScript = `try{if(localStorage.getItem("admin-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [inter, karla, montserrat, sourceSans, playfair, spaceGrotesk].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "!rounded-xl !text-sm" }} />
      </body>
    </html>
  );
}
