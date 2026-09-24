// Dotted loader (see .spinner in App.css). `size` is the approximate diameter in px.
export default function Spinner({ size = 28 }) {
  return <span className="spinner" style={{ '--s': size / 60 }} role="status" aria-label="Loading" />;
}
