// Placeholders shown while a product list loads, so the page has the right shape immediately
// instead of an empty screen with a lone spinner. variant="grid" mirrors the Shop card grid.
export default function ListSkeleton({ rows = 8, variant = 'list' }) {
  if (variant === 'grid') {
    return (
      <div className="product-grid" role="status" aria-label="Loading">
        {Array.from({ length: rows }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <span className="skeleton skeleton-media" />
            <span className="skeleton-card-body">
              <span className="skeleton skeleton-line skeleton-line-lg" />
              <span className="skeleton skeleton-line skeleton-line-sm" />
              <span className="skeleton skeleton-line skeleton-price" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton skeleton-thumb" />
          <span className="skeleton-lines">
            <span className="skeleton skeleton-line skeleton-line-lg" />
            <span className="skeleton skeleton-line skeleton-line-sm" />
          </span>
          <span className="skeleton skeleton-line skeleton-price" />
        </div>
      ))}
    </div>
  );
}
