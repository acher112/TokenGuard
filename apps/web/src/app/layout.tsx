import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: {
    default: "AgentWatch — AI Agent Monitoring & Cost Analytics",
    template: "%s | AgentWatch",
  },
  description:
    "Trace every AI call, debug failures, analyze token usage, and find where your AI budget is being wasted.",
  keywords: ["AI monitoring", "LLM cost", "AI agent debugging", "OpenAI cost tracker"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
