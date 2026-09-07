import { useCallback, useEffect, useRef, useState } from 'react';
import type { ListParams } from '../lib/db';

interface Pager<T> {
  rows: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
}

export function usePagedList<T>(
  loader: (params: ListParams & { page: number }) => Promise<{ rows: T[]; total: number; hasMore: boolean }>,
  base: Omit<ListParams, 'page'>,
  pageSize = 25,
): Pager<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const key = JSON.stringify({ ...base, pageSize });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPage(0);
    loaderRef.current({ ...base, page: 0, pageSize }).then((r) => {
      if (!alive) return;
      setRows(r.rows);
      setTotal(r.total);
      setHasMore(r.hasMore);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [key]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    loaderRef.current({ ...base, page: next, pageSize }).then((r) => {
      setRows((prev) => [...prev, ...r.rows]);
      setTotal(r.total);
      setHasMore(r.hasMore);
      setPage(next);
    }).finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page, base, pageSize]);

  return { rows, loading, loadingMore, hasMore, total, loadMore };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
