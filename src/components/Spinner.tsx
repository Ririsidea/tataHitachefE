import type { CSSProperties } from 'react';

// Dotted loader (see .spinner in App.css). `size` is the approximate diameter in px.
export default function Spinner({ size = 28 }: { size?: number }) {
  return <span className="spinner" style={{ '--s': size / 60 } as CSSProperties} role="status" aria-label="Loading" />;
}
