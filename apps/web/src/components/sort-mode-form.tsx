'use client';

import { useState } from 'react';
import { apiPath } from '@/lib/paths';

type SortMode = 'review' | 'direct';

const OPTIONS: { value: SortMode; label: string; help: string }[] = [
  {
    value: 'review',
    label: 'Je valide chaque rangement',
    help: 'La pochette te montre où chaque note va. Tu acceptes, refuses ou relances.',
  },
  {
    value: 'direct',
    label: 'Ranger tout de suite',
    help: 'Chaque note part directement dans son dossier. Tu peux toujours annuler depuis la pochette.',
  },
];

export function SortModeForm({ initialMode }: { initialMode: SortMode }) {
  const [mode, setMode] = useState(initialMode);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function choose(next: SortMode) {
    const previous = mode;
    setMode(next);
    setState('saving');
    try {
      const response = await fetch(apiPath('/api/settings'), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sortMode: next }),
      });
      if (!response.ok) {
        throw new Error('save failed');
      }
      setState('saved');
    } catch {
      setMode(previous);
      setState('error');
    }
  }

  return (
    <fieldset className="choice-group">
      <legend className="choice-legend">Rangement</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="choice">
          <input
            type="radio"
            name="sortMode"
            value={option.value}
            checked={mode === option.value}
            onChange={() => void choose(option.value)}
          />
          <span className="choice-text">
            <span className="choice-label">{option.label}</span>
            <span className="choice-help">{option.help}</span>
          </span>
        </label>
      ))}
      <p className="choice-status" role="status">
        {state === 'saved' ? 'Enregistré.' : null}
        {state === 'error' ? 'Pas enregistré. Réessaie.' : null}
      </p>
    </fieldset>
  );
}
