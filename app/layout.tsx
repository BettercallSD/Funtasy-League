import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ball Knowledge",
  description: "Let's test your ball knowledge.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="bg-bk-bg text-bk-text flex min-h-full flex-col">
        <TopNav session={session} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
