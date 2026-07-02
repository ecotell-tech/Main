import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * @typedef {'success'|'error'|'warning'} ToastType
 *
 * @typedef {Object} ToastMessage
 * @property {string}    id
 * @property {string}    message
 * @property {ToastType} type
 *
 * @typedef {Object} ToastContextValue
 * @property {ToastMessage[]} toasts
 * @property {Function}       showToast   - (message, type?, duration?) => void
 * @property {Function}       dismissToast - (id) => void
 */

const ToastContext = createContext(/** @type {ToastContextValue} */(null));

const DEFAULT_DURATION_MS = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  const dismissToast = useCallback((id) => {
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success', duration = DEFAULT_DURATION_MS) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [...prev, { id, message, type }]);

      timerRefs.current[id] = setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook to access toast functionality.
 * Must be used inside <ToastProvider>.
 */
export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within <ToastProvider>');
  return ctx;
}
