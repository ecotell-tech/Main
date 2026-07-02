/**
 * useQuery.js — Lightweight async data-fetch hook.
 *
 * Wraps any async service function with loading / error / data states.
 * When the API is live, just swap the service implementation — this hook
 * and the UI components stay identical.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useQuery(getFarmers);
 *
 * @template T
 * @param {() => Promise<T>} queryFn   - Async function that returns data
 * @param {T}               [initial]  - Initial value before first fetch
 * @returns {{ data: T, loading: boolean, error: string|null, refetch: Function }}
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useQuery(queryFn, initial = null) {
  const [data,    setData]    = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Keep a stable ref to queryFn to avoid stale-closure issues
  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (err) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * useMutation — For create / update / delete operations.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation(createFarmer, {
 *     onSuccess: (result) => showToast('Created!', 'success'),
 *   });
 *   mutate(formPayload);
 *
 * @template TInput
 * @template TResult
 * @param {(payload: TInput) => Promise<TResult>} mutationFn
 * @param {{ onSuccess?: Function, onError?: Function }} [options]
 */
export function useMutation(mutationFn, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(payload);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const msg = err?.message ?? 'Operation failed';
      setError(msg);
      options.onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [mutationFn]); // eslint-disable-line react-hooks/exhaustive-deps

  return { mutate, loading, error };
}
