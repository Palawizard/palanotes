'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './icons';

export interface PickerFolder {
  id: string;
  path: string;
}

export const ROOT = 'root';
export const CREATE = 'create';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// A filterable list of folders (WAI-ARIA combobox with a listbox). Type to narrow, arrows to
// move, Enter to choose. Folders that cannot be chosen stay visible but disabled.
export function FolderPicker({
  folders,
  value,
  onChange,
  onSubmit,
  disabled,
  rootLabel,
  allowCreate = false,
  label,
}: {
  folders: PickerFolder[];
  value: string | null;
  onChange: (value: string, path: string) => void;
  onSubmit?: () => void;
  disabled?: (id: string) => string | null;
  rootLabel?: string;
  allowCreate?: boolean;
  label: string;
}) {
  const [filter, setFilter] = useState('');
  const listId = useId();
  const inputId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const words = normalize(filter).split(/\s+/).filter(Boolean);
    const matching = folders.filter((folder) =>
      words.every((word) => normalize(folder.path).includes(word)),
    );
    const list: { id: string; path: string; reason: string | null }[] = [];
    if (rootLabel && words.length === 0) {
      list.push({ id: ROOT, path: rootLabel, reason: disabled?.(ROOT) ?? null });
    }
    for (const folder of matching) {
      list.push({ ...folder, reason: disabled?.(folder.id) ?? null });
    }
    const typed = filter.trim().replace(/\s*\/\s*/g, ' / ');
    if (
      allowCreate &&
      typed &&
      !folders.some((folder) => normalize(folder.path) === normalize(typed))
    ) {
      list.push({ id: CREATE, path: typed, reason: null });
    }
    return list;
  }, [allowCreate, disabled, filter, folders, rootLabel]);

  const enabled = options.filter((option) => !option.reason);
  const active = options.find((option) => option.id === value && !option.reason);

  function choose(index: number) {
    const option = enabled[index];
    if (!option) return;
    onChange(option.id, option.path);
    listRef.current
      ?.querySelector(`[data-option="${CSS.escape(option.id)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const index = enabled.findIndex((option) => option.id === active?.id);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      choose(Math.min(index + 1, enabled.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      choose(Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active) onSubmit?.();
      else choose(0);
    }
  }

  return (
    <div className="picker">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="picker-search">
        <Icon name="search" />
        <input
          id={inputId}
          className="field"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          placeholder="Par exemple : réseau"
          value={filter}
          autoFocus
          autoComplete="off"
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="picker-list">
        {options.length === 0 ? (
          <li className="picker-empty" role="presentation">
            Aucun dossier ne correspond.
          </li>
        ) : null}
        {options.map((option) => {
          const selected = option.id === active?.id;
          return (
            <li
              key={option.id}
              id={`${listId}-${option.id}`}
              data-option={option.id}
              role="option"
              aria-selected={selected}
              aria-disabled={option.reason ? true : undefined}
              className="picker-option"
              onClick={() => {
                if (!option.reason) onChange(option.id, option.path);
              }}
              onDoubleClick={() => {
                if (!option.reason) onSubmit?.();
              }}
            >
              <Icon name={option.id === CREATE ? 'plus' : 'folder'} />
              <span className="picker-path">
                {option.id === CREATE ? `Créer « ${option.path} »` : option.path}
              </span>
              {option.reason ? <span className="picker-reason">{option.reason}</span> : null}
              {selected ? <Icon name="check" className="picker-check" /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
