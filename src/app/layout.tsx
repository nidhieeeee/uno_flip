import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'UNO FLIP! - Classic Card Game Online',
  description:
    'Play online multiplayer UNO FLIP with friends in real-time. Classic card game aesthetic with Light and Dark side decks.',
  keywords: ['uno flip', 'online multiplayer', 'card game', 'classic card game'],
  authors: [{ name: 'UNO FLIP Multiplayer' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#15191F] text-white font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
