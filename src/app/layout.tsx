import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeoSafe AI - Dynamic Geofencing & Tour Safety Platform',
  description:
    'Real-time adaptive geofencing, live GPS tourist telemetry, safety-aware navigation with dynamic route re-ranking, and AI assistance for tour guides and tourists.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
