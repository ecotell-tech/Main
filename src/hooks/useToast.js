import { useToastContext } from '@context/ToastContext';

/**
 * Convenience hook that re-exports showToast and dismissToast
 * from ToastContext.
 *
 * @returns {{ showToast: Function, dismissToast: Function }}
 */
export function useToast() {
  const { showToast, dismissToast } = useToastContext();
  return { showToast, dismissToast };
}
