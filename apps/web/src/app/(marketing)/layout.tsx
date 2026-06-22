import type { ReactNode } from 'react';

/**
 * Route group da landing (URL continua em "/").
 * Renderiza os filhos sem o header global (SessionMenu) do root layout —
 * a landing tem a própria <NavBar>. Mesmo padrão do (auth)/layout.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
