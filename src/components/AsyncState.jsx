import Spinner from './Spinner';

export default function AsyncState({ loading, error, isEmpty, emptyLabel }) {
  if (loading) {
    return (
      <div className="async-loading">
        <Spinner />
      </div>
    );
  }
  if (error) return <div className="error">{error}</div>;
  if (isEmpty) return <div className="empty">{emptyLabel}</div>;
  return null;
}
