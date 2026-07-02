import { useToastContext } from '@context/ToastContext';
import { cn } from '@/lib/utils';

const TOAST_STYLES = {
  success: { icon: 'fa-check-circle',       classes: 'bg-green-700 text-white' },
  error:   { icon: 'fa-times-circle',       classes: 'bg-red-600   text-white' },
  warning: { icon: 'fa-exclamation-triangle', classes: 'bg-amber-500 text-white' },
};

function ToastItem({ id, message, type, onDismiss }) {
  const { icon, classes } = TOAST_STYLES[type] ?? TOAST_STYLES.success;
  return (
    <div
      className={cn(
        'flex items-center gap-3 min-w-[260px] max-w-xs px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
        classes
      )}
      role="alert"
      aria-live="assertive"
    >
      <i className={`fas ${icon} text-base shrink-0`} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button
        className="flex items-center justify-center w-5 h-5 rounded-full opacity-70 hover:opacity-100 hover:bg-white/20 transition-opacity"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <i className="fas fa-times text-xs" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastContext();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}
