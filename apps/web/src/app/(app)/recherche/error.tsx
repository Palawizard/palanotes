'use client';

import { Icon } from '@/components/icons';

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="search-page">
      <h1 className="page-title">Recherche</h1>
      <div className="no-result" role="alert">
        <p>La recherche n’a pas répondu.</p>
        <p className="empty-state">Tes notes ne sont pas touchées. Réessaie dans un instant.</p>
        <button type="button" className="button" onClick={reset}>
          <Icon name="search" />
          Relancer la recherche
        </button>
      </div>
    </div>
  );
}
