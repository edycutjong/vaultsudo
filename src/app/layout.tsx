import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaultSudo — Zero-Trust sudo for AI Agents",
  description:
    "Privilege escalation for AI agents, modeled after Unix sudo. Read freely. Write never — unless you prove you're human.",
  keywords: [
    "AI security",
    "zero-trust",
    "sudo",
    "AI agents",
    "privilege escalation",
    "CIBA",
    "Auth0",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.1)",
              color: "#e2e8f0",
              fontFamily: "var(--font-mono)",
            },
          }}
        />
      </body>
    </html>
  );
}
