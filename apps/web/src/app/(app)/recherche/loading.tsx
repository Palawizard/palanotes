// Shown while the results load: the shape of the result cards, without text.
export default function SearchLoading() {
  return (
    <div className="search-page" aria-busy="true">
      <header className="search-head">
        <h1 className="page-title">Recherche</h1>
        <div className="skeleton skeleton-field" />
      </header>
      <p className="sr-only" role="status">
        Recherche en cours…
      </p>
      <ol className="result-list" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <li key={index} className="result skeleton-card">
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line short" />
            <span className="skeleton skeleton-line" />
          </li>
        ))}
      </ol>
    </div>
  );
}
