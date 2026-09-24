import Spinner from './Spinner';
import { AlertIcon, InboxIcon } from './Icons';

export default function AsyncState({ loading, error, isEmpty, emptyLabel }) {
  if (loading) {
    return (
      <div className="async-loading">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="error" role="alert">
        <AlertIcon size={18} />
        <span>{error}</span>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <InboxIcon size={22} />
        </span>
        <span>{emptyLabel}</span>
      </div>
    );
  }
  return null;
}
