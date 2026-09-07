import type { Metadata } from 'next';
import './globals.css';
import { DM_Sans, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';
import Footer from '@/components/Footer';

// Self-hosted + preloaded by next/font (no render-blocking requests to
// fonts.googleapis.com). Exposed as CSS variables consumed by globals.css.
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Quick Food | Your city, served right',
  description: 'Discover local favorites, delivered or booked in minutes.',
  icons: {
    icon: '/favicon.png',
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Warm up the image CDN used for hero/banner photos before the CSS/JS finish */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
