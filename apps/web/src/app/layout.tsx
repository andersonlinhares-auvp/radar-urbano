import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import { SessionMenu } from '@/components/SessionMenu';

export const metadata = {
  title: 'Radar Urbano — O que está acontecendo no seu bairro agora',
  description:
    'Plataforma aberta de relatos comunitários e dados públicos para o Rio de Janeiro. Saiba o que está acontecendo ao seu redor antes de sair de casa.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Providers>
          <header className="flex items-center justify-end p-4">
            <SessionMenu />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
