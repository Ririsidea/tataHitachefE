import { useRef } from 'react';
import type { PageInfo } from '../types';

// The one Previous / Next control every list screen uses. A cursor has no notion of an
// arbitrary page number, so unlike the old page-based Pagination there is no numbered list -
// only Next (follows pageInfo.nextCursor) and Previous (follows pageInfo.previousCursor),
// enabled by hasNextPage / hasPreviousPage. Changing page scrolls back to the top of the panel.
interface CursorPaginationProps {
  pageInfo: PageInfo;
  // Called with { after: cursor } or { before: cursor } - callers pass this straight to
  // catalog.update / a local cursor setter, which resets to the first page for anything else.
  onCursor: (patch: { after?: string; before?: string }) => void;
}

export default function CursorPagination({ pageInfo, onCursor }: CursorPaginationProps) {
  const navRef = useRef<HTMLElement>(null);
  const { limit, offset, total, hasNextPage, hasPreviousPage, nextCursor, previousCursor } = pageInfo;

  if (!hasNextPage && !hasPreviousPage) return null;

  const go = (patch: { after?: string; before?: string }) => {
    onCursor(patch);
    const target = navRef.current?.closest('.panel') ?? navRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const showRange = total > 0;
  const from = showRange ? offset + 1 : 0;
  const to = showRange ? Math.min(offset + limit, total) : 0;

  return (
    <nav className="pagination" aria-label="Pagination" ref={navRef}>
      {showRange && (
        <p className="pagination-summary" aria-live="polite">
          Showing {from}–{to} of {total}
        </p>
      )}
      <div className="pagination-compact">
        <button
          type="button"
          className="pagination-step"
          onClick={() => previousCursor && go({ before: previousCursor })}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <span aria-hidden="true">‹</span> Prev
        </button>
        <button
          type="button"
          className="pagination-step"
          onClick={() => nextCursor && go({ after: nextCursor })}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          Next <span aria-hidden="true">›</span>
        </button>
      </div>
    </nav>
  );
}
