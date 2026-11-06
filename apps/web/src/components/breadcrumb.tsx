import Link from 'next/link';
import { Icon } from './icons';

export interface Crumb {
  label: string;
  href?: string;
}

// Path to the current place; the last crumb is the current page and is not a link.
// With `endsHere` false, every crumb with a link stays a link (a note's folders, shown above it).
export function Breadcrumb({
  items,
  label = 'Chemin',
  endsHere = true,
}: {
  items: Crumb[];
  label?: string;
  endsHere?: boolean;
}) {
  return (
    <nav className="crumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => {
          const last = endsHere && index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`}>
              {index > 0 ? <Icon name="chevronRight" size={12} className="crumbs-sep" /> : null}
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
