import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Task Assistant',
  description: 'A shared to-do list assistant powered by Supabase.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
