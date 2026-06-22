import type { ReactNode } from 'react';

/**
 * Auth route group layout.
 * Intentionally renders children without the site header (SessionMenu)
 * that lives in the root layout. The root layout still applies fonts + Providers.
 */
export default function AuthRouteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
