'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icons';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Écrire', icon: 'write' },
  { href: '/dossiers', label: 'Dossiers', icon: 'folder' },
  { href: '/recherche', label: 'Recherche', icon: 'search' },
];

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
          <Icon name={link.icon} />
          <span>{link.label}</span>
        </Link>
      ))}
      {/* On a phone the rail becomes a tab bar: settings join it. */}
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
      <Icon name="sliders" />
      <span>Réglages</span>
    </Link>
  );
}
