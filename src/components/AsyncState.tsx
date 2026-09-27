import Spinner from './Spinner';
import { AlertIcon, InboxIcon } from './Icons';

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyLabel: string;
}

export default function AsyncState({ loading, error, isEmpty, emptyLabel }: AsyncStateProps) {
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
