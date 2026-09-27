import { useRef } from 'react';
import { ELLIPSIS, getPageItems } from '../utils/pagination';

// Compact "‹ Prev  Page 2 of 12  Next ›" on phones (< 640px), windowed numbers on larger screens
// (the two are switched with CSS, so there is no resize listener). Optional totalItems + pageSize
// add a "Showing 11–20 of 187" line. Changing page scrolls back to the top of the page content.
interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export default function Pagination({ page, totalPages, onChange, totalItems, pageSize }: PaginationProps) {
  const navRef = useRef<HTMLElement>(null);
  if (totalPages <= 1) return null;

  const go = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onChange(next);
    const target = navRef.current?.closest('.panel') ?? navRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const showRange = totalItems !== undefined && pageSize !== undefined && Number.isFinite(totalItems) && Number.isFinite(pageSize) && totalItems > 0;
  const from = showRange ? (page - 1) * pageSize + 1 : 0;
  const to = showRange ? Math.min(page * pageSize, totalItems) : 0;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="pagination" aria-label="Pagination" ref={navRef}>
      {showRange && (
        <p className="pagination-summary" aria-live="polite">
          Showing {from}–{to} of {totalItems}
        </p>
      )}

      <div className="pagination-compact">
        <button
          type="button"
          className="pagination-step"
          onClick={() => go(page - 1)}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          <span aria-hidden="true">‹</span> Prev
        </button>
        <span className="pagination-status">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="pagination-step"
          onClick={() => go(page + 1)}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          Next <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="pagination-full">
        <button
          type="button"
          className="pagination-arrow"
          onClick={() => go(page - 1)}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          ‹
        </button>
        {getPageItems(page, totalPages).map((item, i) =>
          item === ELLIPSIS ? (
            <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={item === page ? 'pagination-page active' : 'pagination-page'}
              onClick={() => go(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className="pagination-arrow"
          onClick={() => go(page + 1)}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </nav>
  );
}
