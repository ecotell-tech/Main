/**
 * usePagination — lightweight pagination + sort + search state hook.
 *
 * Usage:
 *   const { page, pageSize, sortKey, sortDir, search,
 *           setPage, setPageSize, setSearch, handleSort,
 *           paginate, pageNumbers } = usePagination(data, { pageSize: 10 });
 *   const rows = paginate(data);  // already filtered+sorted+sliced
 */
import { useState, useMemo, useCallback } from 'react';

export function usePagination(allData, { pageSize: defaultPageSize = 10, initialSortKey = '', initialSortDir = 'asc' } = {}) {
  const [page,    setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);
  const [sortKey,  setSortKey]     = useState(initialSortKey);
  const [sortDir,  setSortDir]     = useState(initialSortDir);
  const [search,   setSearchRaw]   = useState('');

  const setPage    = useCallback((p) => setPageRaw(p),         []);
  const setPageSize = useCallback((s) => { setPageSizeRaw(s); setPageRaw(1); }, []);
  const setSearch  = useCallback((q) => { setSearchRaw(q); setPageRaw(1); }, []);

  const handleSort = useCallback((field) => {
    setSortKey(prev => {
      if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return prev; }
      setSortDir('asc');
      return field;
    });
    setPageRaw(1);
  }, []);

  /** Apply sort to an array. Uses localeCompare for strings, numeric compare for numbers. */
  const sort = useCallback((data) => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortKey, sortDir]);

  /** Slice a sorted array into the current page. */
  const paginate = useCallback((sorted) => {
    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safe  = Math.min(page, pages);
    return sorted.slice((safe - 1) * pageSize, safe * pageSize);
  }, [page, pageSize]);

  /** Derived totals / page list based on the data passed in. */
  const stats = useMemo(() => {
    const total = allData?.length ?? 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safe  = Math.min(page, pages);
    const start = total === 0 ? 0 : (safe - 1) * pageSize + 1;
    const end   = Math.min(safe * pageSize, total);
    return { total, pages, safePage: safe, start, end };
  }, [allData, page, pageSize]);

  /** Array of page numbers (with '…' ellipsis for large page counts). */
  const pageNumbers = useMemo(() => {
    const { pages, safePage } = stats;
    return Array.from({ length: pages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === pages || Math.abs(p - safePage) <= 1)
      .reduce((acc, p, i, arr) => {
        if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
        acc.push(p);
        return acc;
      }, []);
  }, [stats]);

  return {
    page, pageSize, sortKey, sortDir, search,
    setPage, setPageSize, setSearch, handleSort,
    sort, paginate, stats, pageNumbers,
  };
}

/** SortTh — sortable <th> cell for use inside <thead> */
export function SortTh({ label, field, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`cursor-pointer select-none whitespace-nowrap transition-colors ${active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'} ${className}`}
    >
      {label}
      <i className={`ml-1.5 text-[9px] fas ${
        active
          ? sortDir === 'asc' ? 'fa-sort-up text-blue-600' : 'fa-sort-down text-blue-600'
          : 'fa-sort text-slate-300'
      }`} />
    </th>
  );
}

/**
 * PaginationBar — standard footer with first/prev/page-numbers/next/last.
 * Props: stats, pageNumbers, page, setPage, label (optional, e.g. "rows")
 */
export function PaginationBar({ stats, pageNumbers, page, setPage, label = 'rows' }) {
  const { start, end, total, pages, safePage } = stats;
  if (pages <= 1 && total === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50 text-xs text-slate-500">
      <span>
        {total === 0
          ? `No ${label}`
          : `${start}–${end} of ${total} ${label}`}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <PgBtn onClick={() => setPage(1)}              disabled={safePage === 1}      icon="fa-angles-left" />
          <PgBtn onClick={() => setPage(p => p - 1)}    disabled={safePage === 1}      icon="fa-angle-left" />
          {pageNumbers.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-slate-400">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium border transition ${
                  safePage === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                {p}
              </button>
            )
          )}
          <PgBtn onClick={() => setPage(p => p + 1)}    disabled={safePage === pages}  icon="fa-angle-right" />
          <PgBtn onClick={() => setPage(pages)}          disabled={safePage === pages}  icon="fa-angles-right" />
        </div>
      )}
    </div>
  );
}

function PgBtn({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 disabled:cursor-not-allowed transition"
    >
      <i className={`fas ${icon} text-[10px]`} />
    </button>
  );
}

/** Thin search input that calls setSearch on change */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition bg-white"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 text-[9px] transition"
        >
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  );
}
