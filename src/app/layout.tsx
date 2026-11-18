import type { Metadata } from "next";
import { Cormorant_Garamond, Alex_Brush, Plus_Jakarta_Sans } from "next/font/google";
import { BagProvider } from "@/context/BagContext";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const alexBrush = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maria's Store — Moda Casual Feminina",
  description:
    "Curadoria de moda casual feminina em linho, alfaiataria leve, tricot e vestidos fluidos. Escolha seu tom e finalize com atendimento próximo.",
  openGraph: {
    title: "Maria's Store — Moda Casual Feminina",
    description:
      "Alfaiataria leve, casacos estruturados, tricot e vestidos fluidos com curadoria autoral.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${cormorant.variable} ${alexBrush.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen bg-cream text-espresso antialiased">
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-espresso focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-cream"
        >
          Ir para o conteúdo principal
        </a>
        <BagProvider>{children}</BagProvider>
      </body>
    </html>
  );
}
