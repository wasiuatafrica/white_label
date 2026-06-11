import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './global.css';
import { Providers } from './providers';

const LOGO_URL = 'https://res.cloudinary.com/ddlupbcws/image/upload/v1781211105/logo_trg4xb.png';

export const metadata: Metadata = {
  title: 'FT9ja Partner Program — Launch Your Prop Firm',
  description:
    'Build your own prop trading firm powered by FT9ja. Brand it, sell evaluations, keep the markup.',
  icons: {
    icon: LOGO_URL,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
        />
      </head>
      <body style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
