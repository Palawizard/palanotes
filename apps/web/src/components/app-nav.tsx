'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Écrire' },
  { href: '/dossiers', label: 'Dossiers' },
  { href: '/recherche', label: 'Recherche' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/dossiers') {
    return pathname.startsWith('/dossiers') || pathname.startsWith('/note/');
  }
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="rail-nav" aria-label="Navigation principale">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rail-link"
          aria-current={isActive(pathname, link.href) ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
      {/* On a phone the rail foot is hidden, so settings join the bar. */}
      <SettingsLink className="rail-only-phone" />
    </nav>
  );
}

export function SettingsLink({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  return (
    <Link
      href="/reglages"
      className={`rail-link ${className}`.trim()}
      aria-current={pathname.startsWith('/reglages') ? 'page' : undefined}
    >
      Réglages
    </Link>
  );
}
