import { getEvents } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import AsyncState from '../components/AsyncState';
import EventRow from '../components/EventRow';

export default function LiveEvents() {
  const { data, error, loading } = usePolling(() => getEvents(50), 4000);
  const events = data?.data || [];

  return (
    <div className="panel">
      <h2>Live Events</h2>
      <p className="hint">
        Polling every 4 seconds — trigger a webhook in Shopify Admin and watch it land here.
      </p>
      <AsyncState loading={loading} error={error} isEmpty={false} emptyLabel="" />
      <div className="event-feed">
        {!loading && (
          <AsyncState loading={false} error={null} isEmpty={events.length === 0} emptyLabel="No events yet." />
        )}
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
