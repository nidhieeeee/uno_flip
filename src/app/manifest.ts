import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UNO FLIP! Online - Real-Time Multiplayer Card Game',
    short_name: 'UNO FLIP',
    description:
      'Play online multiplayer UNO FLIP with friends in real-time. Features Light and Dark decks, penalty stacking, turn countdowns, and instant room invites.',
    start_url: '/',
    display: 'standalone',
    background_color: '#15191F',
    theme_color: '#ED1C24',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

