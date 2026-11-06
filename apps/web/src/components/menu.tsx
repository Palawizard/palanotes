'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from './icons';

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuPosition {
  x: number;
  y: number;
}

const MARGIN = 8;

// A list of actions floating at a point (a right click) or under a button. Arrow keys move,
// Enter picks, Escape or a click outside closes and gives the focus back.
export function MenuPopup({
  label,
  items,
  position,
  onClose,
  returnFocus,
}: {
  label: string;
  items: MenuItem[];
  position: MenuPosition;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState(position);

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPlace({
      x: Math.max(MARGIN, Math.min(position.x, window.innerWidth - width - MARGIN)),
      y: Math.max(MARGIN, Math.min(position.y, window.innerHeight - height - MARGIN)),
    });
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [position]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [onClose]);

  function close() {
    onClose();
    returnFocus?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
        []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => {
      event.preventDefault();
      buttons[(next + buttons.length) % buttons.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(buttons.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      close();
    }
  }

  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      aria-label={label}
      style={{ left: place.x, top: place.y }}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className="menu-item"
          data-danger={item.danger || undefined}
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.icon ? <Icon name={item.icon} /> : <span className="menu-icon-gap" />}
          {item.label}
        </button>
      ))}
    </div>
  );
}
