import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://unoflip.online';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ED1C24' },
    { media: '(prefers-color-scheme: dark)', color: '#15191F' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'UNO FLIP! Online - Real-Time Multiplayer Card Game',
    template: '%s | UNO FLIP! Online',
  },
  description:
    'Play online multiplayer UNO FLIP with friends in real-time. Features the authentic Light & Dark side flip mechanic, cross-color penalty stacking, live game feed, and instant room invites in your browser.',
  applicationName: 'UNO FLIP! Online',
  keywords: [
    'uno flip',
    'uno flip online',
    'play uno flip',
    'uno flip multiplayer',
    'uno flip card game',
    'play uno with friends',
    'dark side uno',
    'uno flip rules',
    'free online uno flip',
    'card games online',
    'multiplayer card game',
    'realtime card game',
  ],
  authors: [{ name: 'UNO FLIP Online' }],
  creator: 'UNO FLIP Online',
  publisher: 'UNO FLIP Online',
  category: 'game',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'UNO FLIP! Online - Real-Time Multiplayer Card Game',
    description:
      'Play online multiplayer UNO FLIP with friends in real-time. Flip to the Dark Side, stack penalties, and race to call UNO!',
    url: '/',
    siteName: 'UNO FLIP! Online',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UNO FLIP! Online - Real-Time Multiplayer Card Game',
    description:
      'Play online multiplayer UNO FLIP with friends in real-time. Light & Dark side decks, penalty stacking, and private rooms.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#app`,
      name: 'UNO FLIP! Online',
      url: siteUrl,
      description:
        'Play online multiplayer UNO FLIP with friends in real-time. Features the authentic Light & Dark side flip mechanic, cross-color penalty stacking, live game feed, and instant room invites in your browser.',
      applicationCategory: 'GameApplication',
      operatingSystem: 'All modern web browsers',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
    },
    {
      '@type': 'Game',
      '@id': `${siteUrl}/#game`,
      name: 'UNO FLIP! Online',
      description:
        'A real-time multiplayer card game featuring double-sided cards (Light Side & Dark Side), flip cards, and penalty stacking.',
      genre: ['Card Game', 'Multiplayer', 'Casual Game', 'Family Game'],
      playMode: 'MultiPlayer',
      numberOfPlayers: {
        '@type': 'QuantitativeValue',
        minValue: 2,
        maxValue: 4,
      },
      url: siteUrl,
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#15191F] text-white font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
