import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "xyi — SoundCloud co-listening",
  description:
    "Real-time synchronous co-listening of SoundCloud music in private rooms.",
  keywords: [
    "SoundCloud",
    "Co-listening",
    "Sync Music",
    "Realtime",
    "Supabase",
  ],
  authors: [{ name: "xyi" }],
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
      className={`${onest.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{ backgroundColor: "#04040a" }}
    >
      <body className="min-h-full flex flex-col bg-[#04040a] text-white selection:bg-[#007aff]/20 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
