import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"], // Add Cyrillic for Russian room titles or names if necessary
});

export const metadata = {
  title: "xyi — SoundCloud co-listening",
  description: "A gorgeous, ultra-minimalist iOS-inspired web application for synchronous real-time co-listening of SoundCloud music in private rooms.",
  keywords: ["SoundCloud", "Co-listening", "Sync Music", "Realtime", "Supabase", "iOS minimal"],
  authors: [{ name: "xyi developer" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased`}
      style={{ backgroundColor: "#000000" }}
    >
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-[#ff5500]/30 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
