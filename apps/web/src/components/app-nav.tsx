'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Écrire' },
  { href: '/reglages', label: 'Réglages' },
] as const;

function isActive(pathname: string, href: string): boolean {
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
    </nav>
  );
}
