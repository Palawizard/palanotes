'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { currentDrag, endDrag } from '@/lib/drag';
import { serializeTreeCookie, TREE_COOKIE } from '@/lib/tree-cookie';
import type { FolderItem } from '@/server/folders';
import { useFolderActions } from './folder-actions';
import { Icon } from './icons';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const YEAR = 60 * 60 * 24 * 365;
const OPEN_DELAY = 700;

interface VisibleItem {
  item: FolderItem;
  level: number;
  hasChildren: boolean;
  setSize: number;
  posInSet: number;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function countLabel(item: FolderItem): string {
  if (item.totalCount === 0) return 'vide';
  const total = `${item.totalCount} note${item.totalCount > 1 ? 's' : ''}`;
  return item.noteCount === item.totalCount ? total : `${total} dont ${item.noteCount} ici`;
}

function saveOpen(ids: Set<string>): void {
  document.cookie = `${TREE_COOKIE}=${serializeTreeCookie(ids)}; path=${BASE_PATH || '/'}; max-age=${YEAR}; samesite=lax`;
}

// Folder tree of the explorer, following the WAI-ARIA tree pattern: one tab stop, arrows to
// move, Right and Left to open and close, Home and End, first letter to jump, Enter to open.
export function FolderTree({ items, savedOpen }: { items: FolderItem[]; savedOpen: string[] }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const currentId = params.id && params.id !== 'recents' ? params.id : null;

  const { byId, children } = useMemo(() => {
    const map = new Map(items.map((item) => [item.id, item]));
    const kids = new Map<string | null, FolderItem[]>();
    for (const item of items) {
      const key = item.parentId && map.has(item.parentId) ? item.parentId : null;
      kids.set(key, [...(kids.get(key) ?? []), item]);
    }
    return { byId: map, children: kids };
  }, [items]);

  const ancestorsOf = (id: string | null): string[] => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let parent = id ? byId.get(id)?.parentId : null;
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      chain.push(parent);
      parent = byId.get(parent)?.parentId ?? null;
    }
    return chain;
  };

  const [open, setOpen] = useState<Set<string>>(
    () => new Set([...savedOpen, ...ancestorsOf(currentId)]),
  );
  const way = ancestorsOf(currentId);
  const wayKey = `${currentId}:${way.join('.')}`;
  const [shownFor, setShownFor] = useState(wayKey);
  if (shownFor !== wayKey) {
    // A new current folder, or the current one moved: open the way to it, keep the rest.
    setShownFor(wayKey);
    setOpen((previous) => new Set([...previous, ...way]));
  }
  const [focusId, setFocusId] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());
  const actions = useFolderActions();
  const [dropId, setDropId] = useState<string | null>(null);
  const openTimer = useRef<number | undefined>(undefined);

  const visible = useMemo(() => {
    const list: VisibleItem[] = [];
    const walk = (parentId: string | null, level: number, seen: Set<string>) => {
      const siblings = children.get(parentId) ?? [];
      siblings.forEach((item, index) => {
        if (seen.has(item.id)) return;
        const kids = children.get(item.id) ?? [];
        list.push({
          item,
          level,
          hasChildren: kids.length > 0,
          setSize: siblings.length,
          posInSet: index + 1,
        });
        if (kids.length > 0 && open.has(item.id)) {
          walk(item.id, level + 1, new Set(seen).add(item.id));
        }
      });
    };
    walk(null, 1, new Set());
    return list;
  }, [children, open]);

  const tabStop =
    (focusId && visible.some((entry) => entry.item.id === focusId) && focusId) ||
    (currentId && visible.some((entry) => entry.item.id === currentId) && currentId) ||
    visible[0]?.item.id;

  function focus(id: string | undefined) {
    if (!id) return;
    setFocusId(id);
    refs.current.get(id)?.focus();
  }

  function toggle(id: string, next?: boolean) {
    const copy = new Set(open);
    if (next ?? !copy.has(id)) copy.add(id);
    else copy.delete(id);
    setOpen(copy);
    saveOpen(copy);
  }

  function canDrop(targetId: string): boolean {
    const drag = currentDrag();
    if (!drag || drag.from === targetId) return false;
    return drag.kind === 'note' || !actions.subtree(drag.id).has(targetId);
  }

  function onDragOver(event: DragEvent, item: FolderItem, hasChildren: boolean) {
    if (!canDrop(item.id)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropId !== item.id) {
      setDropId(item.id);
      window.clearTimeout(openTimer.current);
      // Hovering a closed folder while dragging opens it, to reach its subfolders.
      if (hasChildren && !open.has(item.id)) {
        openTimer.current = window.setTimeout(() => toggle(item.id, true), OPEN_DELAY);
      }
    }
  }

  function onDragLeave(event: DragEvent, id: string) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropId === id) {
      setDropId(null);
      window.clearTimeout(openTimer.current);
    }
  }

  function onDrop(event: DragEvent, targetId: string) {
    const drag = currentDrag();
    setDropId(null);
    window.clearTimeout(openTimer.current);
    if (!drag || !canDrop(targetId)) return;
    event.preventDefault();
    endDrag();
    if (drag.kind === 'note') {
      void actions.moveNote(
        { id: drag.id, title: drag.label, folderId: drag.from ?? '' },
        targetId,
      );
    } else {
      void actions.moveFolder(drag.id, targetId);
    }
  }

  function openMenuFor(id: string, fromKeyboard: { x: number; y: number } | null) {
    const node = refs.current.get(id) ?? null;
    const row = node?.querySelector('.tree-row')?.getBoundingClientRect();
    const position = fromKeyboard ?? { x: (row?.left ?? 0) + 24, y: row?.bottom ?? 0 };
    actions.openMenu(id, position, node);
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const index = visible.findIndex((entry) => entry.item.id === tabStop);
    const entry = visible[index];
    if (!entry) return;
    const { item, hasChildren } = entry;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
      case 'ArrowDown':
        handled();
        focus(visible[Math.min(index + 1, visible.length - 1)]?.item.id);
        break;
      case 'ArrowUp':
        handled();
        focus(visible[Math.max(index - 1, 0)]?.item.id);
        break;
      case 'Home':
        handled();
        focus(visible[0]?.item.id);
        break;
      case 'End':
        handled();
        focus(visible.at(-1)?.item.id);
        break;
      case 'ArrowRight':
        handled();
        if (hasChildren && !open.has(item.id)) toggle(item.id, true);
        else if (hasChildren) focus(visible[index + 1]?.item.id);
        break;
      case 'ArrowLeft':
        handled();
        if (hasChildren && open.has(item.id)) toggle(item.id, false);
        else if (item.parentId && byId.has(item.parentId)) focus(item.parentId);
        break;
      case 'Enter':
      case ' ':
        handled();
        router.push(`/dossiers/${item.id}`);
        break;
      case 'ContextMenu':
        handled();
        openMenuFor(item.id, null);
        break;
      case 'F10':
        if (event.shiftKey) {
          handled();
          openMenuFor(item.id, null);
        }
        break;
      default:
        if (event.key.length === 1 && /\p{L}|\p{N}/u.test(event.key)) {
          handled();
          const letter = normalize(event.key);
          const after = [...visible.slice(index + 1), ...visible.slice(0, index + 1)];
          focus(after.find((other) => normalize(other.item.name).startsWith(letter))?.item.id);
        }
    }
  }

  // A flat list of tree items, the level given by aria-level: each item's name is exactly
  // its visible text, without the text of its subfolders.
  return (
    <ul role="tree" aria-label="Dossiers" className="tree" onKeyDown={onKeyDown}>
      {visible.map((entry) => {
        const { item, hasChildren, level } = entry;
        const isOpen = hasChildren && open.has(item.id);
        const isCurrent = item.id === currentId;
        return (
          <li
            key={item.id}
            ref={(node) => {
              if (node) refs.current.set(item.id, node);
              else refs.current.delete(item.id);
            }}
            role="treeitem"
            data-folder={item.id}
            aria-level={level}
            aria-setsize={entry.setSize}
            aria-posinset={entry.posInSet}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-selected={isCurrent}
            aria-labelledby={`tree-name-${item.id} tree-total-${item.id}`}
            aria-describedby={`tree-count-${item.id}`}
            tabIndex={item.id === tabStop ? 0 : -1}
            onFocus={(event) => {
              if (event.target === event.currentTarget) setFocusId(item.id);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFocusId(item.id);
              openMenuFor(item.id, { x: event.clientX, y: event.clientY });
            }}
            className="tree-item"
          >
            <div
              className="tree-row"
              data-current={isCurrent || undefined}
              data-drop={dropId === item.id || undefined}
              style={{ '--level': level - 1 } as CSSProperties}
              draggable
              data-drag="folder"
              data-id={item.id}
              data-label={item.name}
              data-from={item.parentId ?? ''}
              onDragOver={(event) => onDragOver(event, item, hasChildren)}
              onDragLeave={(event) => onDragLeave(event, item.id)}
              onDrop={(event) => onDrop(event, item.id)}
            >
              <span
                className="tree-toggle"
                data-open={isOpen || undefined}
                aria-hidden="true"
                onClick={hasChildren ? () => toggle(item.id) : undefined}
              >
                {hasChildren ? <Icon name="chevronRight" size={14} /> : null}
              </span>
              <Link
                href={`/dossiers/${item.id}`}
                className="tree-link"
                tabIndex={-1}
                onClick={() => setFocusId(item.id)}
                title={item.path}
              >
                <Icon name="folder" className="tree-icon" />
                <span className="tree-name" id={`tree-name-${item.id}`}>
                  {item.name}
                </span>{' '}
                <span className="sr-only" id={`tree-count-${item.id}`}>
                  {countLabel(item)}
                </span>{' '}
                <span className="tree-count" id={`tree-total-${item.id}`}>
                  {item.totalCount > 0 ? item.totalCount : ''}
                </span>
              </Link>
              <button
                type="button"
                className="tree-more icon-button"
                tabIndex={-1}
                aria-label={`Actions sur ${item.name}`}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setFocusId(item.id);
                  actions.openMenu(
                    item.id,
                    { x: rect.left, y: rect.bottom + 4 },
                    event.currentTarget,
                  );
                }}
              >
                <Icon name="more" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
