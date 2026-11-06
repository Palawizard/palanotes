import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const sans = Atkinson_Hyperlegible_Next({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-atkinson',
  display: 'swap',
});
const mono = Atkinson_Hyperlegible_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-atkinson-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Notes', template: '%s · Notes' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#b98a55' },
    { media: '(prefers-color-scheme: dark)', color: '#4a3a2a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
