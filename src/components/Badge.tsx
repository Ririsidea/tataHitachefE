import type { ReactNode } from 'react';
import type { Tone } from '../types';

const WARNING_WORDS = ['pending', 'partial', 'unpaid', 'unfulfilled', 'authorized', 'on hold', 'attempted', 'ready_for_pickup'];
const SUCCESS_WORDS = ['paid', 'fulfilled', 'delivered', 'success', 'active', 'complete'];
const DANGER_WORDS = ['cancelled', 'canceled', 'refunded', 'voided', 'failed', 'failure', 'error', 'out of stock'];

export function toneForStatus(value: string | null | undefined): Tone {
  const normalized = String(value || '').toLowerCase();
  if (WARNING_WORDS.some((w) => normalized.includes(w))) return 'warning';
  if (SUCCESS_WORDS.some((w) => normalized.includes(w))) return 'success';
  if (DANGER_WORDS.some((w) => normalized.includes(w))) return 'danger';
  return 'info';
}

export default function Badge({ tone = 'info', children }: { tone?: Tone; children?: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-label">{children}</span>
    </span>
  );
}
