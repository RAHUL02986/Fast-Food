import type { Metadata } from 'next';
import './globals.css';

import { AuthProvider } from '@/lib/AuthContext';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Quick Food | Your city, served right',
  description: 'Discover local favorites, delivered or booked in minutes.',
  icons: {
    icon: '/favicon.png',
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
