import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications } from '@services/notificationService';

const READ_KEY = 'pscms_notif_read';

const TYPE_META = {
  danger:  { color: '#ef4444', bg: '#fef2f2' },
  warning: { color: '#d97706', bg: '#fffbeb' },
  info:    { color: '#2563eb', bg: '#eff6ff' },
  success: { color: '#16a34a', bg: '#f0fdf4' },
};

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function loadReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveReadIds(set) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NotificationPanel({ isOpen, onClose, accentColor }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState('all');
  const [readIds, setReadIds] = useState(loadReadIds);
  const panelRef = useRef(null);

  // Fetch when opened
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getNotifications()
      .then(setNotifs)
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const markRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev).add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const all = new Set(notifs.map(n => n.id));
    saveReadIds(all);
    setReadIds(all);
  }, [notifs]);

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !readIds.has(n.id);
    if (filter === 'alerts') return n.type === 'danger' || n.type === 'warning';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-border shadow-2xl z-50 flex flex-col overflow-hidden"
      style={{ maxHeight: '80vh' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[0.65rem] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none min-w-[1.1rem] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium hover:underline"
              style={{ color: accentColor }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close notifications"
          >
            <i className="fas fa-xmark text-xs" />
          </button>
        </div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border px-3 shrink-0 bg-muted/20">
        {[
          { id: 'all',    label: 'All',    count: notifs.length    },
          { id: 'unread', label: 'Unread', count: unreadCount       },
          { id: 'alerts', label: 'Alerts', count: notifs.filter(n => n.type === 'danger' || n.type === 'warning').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-1.5 py-2 px-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px
              ${filter === tab.id
                ? 'border-current'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            style={filter === tab.id ? { color: accentColor, borderColor: accentColor } : {}}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-[0.55rem] font-bold rounded-full px-1 leading-none py-0.5
                  ${filter === tab.id ? 'text-white' : 'text-muted-foreground bg-muted'}`}
                style={filter === tab.id ? { background: accentColor } : {}}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ──────────────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <i className="fas fa-circle-notch fa-spin mr-2" />Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-bell-slash text-muted-foreground text-lg" />
            </div>
            <p className="text-sm font-semibold text-foreground">All clear!</p>
            <p className="text-xs text-muted-foreground mt-0.5">No notifications in this category.</p>
          </div>
        ) : (
          filtered.map(n => {
            const meta  = TYPE_META[n.type] ?? TYPE_META.info;
            const isRead = readIds.has(n.id);
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 ${!isRead ? 'bg-blue-50/40' : ''}`}
              >
                {/* Type icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: meta.bg }}
                >
                  <i className={`${n.icon} text-sm`} style={{ color: meta.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold leading-snug ${isRead ? 'text-foreground' : 'text-foreground'}`}>
                      {n.title}
                    </span>
                    {n.time && (
                      <span className="text-[0.62rem] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {timeAgo(n.time)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.desc}</p>

                  {/* Type badge */}
                  <span
                    className="inline-block mt-1.5 text-[0.6rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {n.type === 'danger' ? 'urgent' : n.type}
                  </span>
                </div>

                {/* Unread dot */}
                {!isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      {!loading && notifs.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/10 text-center shrink-0">
          <span className="text-xs text-muted-foreground">
            {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  );
}
