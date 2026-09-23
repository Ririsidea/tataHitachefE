import { summarize } from '../utils/formatters';
import Badge from './Badge';

export default function EventRow({ event }) {
  return (
    <div className="event-row">
      <span className="event-topic">{event.topic}</span>
      <span className="event-summary">{summarize(event.topic, event.payload)}</span>
      <span className="event-status">{!event.verified && <Badge tone="danger">Unverified</Badge>}</span>
      <span className="event-time">{new Date(event.receivedAt).toLocaleTimeString()}</span>
    </div>
  );
}
