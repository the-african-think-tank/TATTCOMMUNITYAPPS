import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | The African Think Tank",
    default: "TATT Member Portal - The African Think Tank",
  },
  description: "Join The African Think Tank (TATT) community. A vibrant network empowering the African diaspora through culture, connection, professional development, and community impact. Access resources, network with leaders, and drive global change.",
  keywords: ["African diaspora", "TATT", "The African Think Tank", "African networking", "African professionals", "African community", "NGO"],
  openGraph: {
    title: "TATT Member Portal - The African Think Tank",
    description: "Empowering the African Diaspora through Culture, Connection, and Community. Join us in driving global change.",
    siteName: "The African Think Tank",
    type: "website",
  },
  icons: {
    icon: "/assets/tattlogoIcon.svg",
    apple: "/assets/tattlogoIcon.svg",
  },
};

import { ToastProvider } from "@/components/organisms/ToastProvider";
import QueryProvider from "@/context/query-provider";
import { TermsProvider } from "@/context/terms-context";
import { HeroUIAppProvider } from "@/providers/hero-ui-provider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider />
        <HeroUIAppProvider>
          <QueryProvider>
              <AuthProvider>
                <TermsProvider>
                  {children}
                </TermsProvider>
              </AuthProvider>
          </QueryProvider>
        </HeroUIAppProvider>
      </body>
    </html>
  );
}
