import Badge from './Badge';
import { LockIcon } from './Icons';
import { STAGE_LABELS, STAGE_TONES, isOrderLocked, orderStage } from '../utils/orderStage';

// The order's current lifecycle stage (Pending / Paid / Fulfilled / ...) and, once it is
// fulfilled, a lock chip - a fulfilled order can no longer be cancelled, edited or changed.
export default function OrderStageBadge({ order }) {
  const stage = orderStage(order);
  return (
    <span className="stage-cell">
      <Badge tone={STAGE_TONES[stage] || 'info'}>{STAGE_LABELS[stage] || stage}</Badge>
      {isOrderLocked(order) && (
        <span className="lock-chip" title="Fulfilled - this order is locked">
          <LockIcon size={13} />
          Locked
        </span>
      )}
    </span>
  );
}
