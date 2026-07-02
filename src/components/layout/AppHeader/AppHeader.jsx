import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth }        from '@context/AuthContext';
import { useRoleTheme }  from '@hooks/useRoleTheme';
import Avatar            from '@common/Avatar/Avatar';
import NotificationPanel from '@common/NotificationPanel/NotificationPanel';
import { getNotifications } from '@services/notificationService';

const READ_KEY = 'pscms_notif_read';

function loadReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); }
  catch { return new Set(); }
}

export default function AppHeader({ pageTitle, pageSubtitle, onMenuToggle }) {
  const { currentUser } = useAuth();
  const theme = useRoleTheme();

  const [panelOpen,   setPanelOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);

  // Poll for unread count every 2 minutes (silent background check)
  const refreshUnread = useCallback(async () => {
    try {
      const notifs  = await getNotifications();
      const readIds = loadReadIds();
      setUnreadCount(notifs.filter(n => !readIds.has(n.id)).length);
    } catch { /* offline / not logged in yet */ }
  }, []);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  // After panel closes, refresh unread count (user may have read some)
  function handleClosePanel() {
    setPanelOpen(false);
    setTimeout(refreshUnread, 200);
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-sm border-b border-border shadow-[0_1px_3px_0_rgb(0_0_0_/_0.06)] shrink-0">

      {/* Hamburger (mobile) */}
      <button
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar navigation"
      >
        <i className="fas fa-bars text-sm" aria-hidden="true" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-foreground font-heading leading-tight truncate">{pageTitle}</div>
        {pageSubtitle && (
          <div className="hidden sm:block text-xs text-muted-foreground leading-tight mt-0.5">{pageSubtitle}</div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">

        {/* Search (placeholder) */}
        <button
          className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Search"
          aria-label="Search"
        >
          <i className="fas fa-search text-sm" aria-hidden="true" />
        </button>

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setPanelOpen(o => !o)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors
              ${panelOpen
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            title="Notifications"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={panelOpen}
            aria-haspopup="dialog"
          >
            <i className="fas fa-bell text-sm" aria-hidden="true" />

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 flex items-center justify-center rounded-full text-[0.55rem] font-bold text-white leading-none px-0.5 ring-2 ring-white"
                style={{ background: '#ef4444' }}
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}

            {/* Static red dot when no count yet but clearly online */}
            {unreadCount === 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white"
                style={{ background: '#94a3b8' }}
                aria-hidden="true"
              />
            )}
          </button>

          <NotificationPanel
            isOpen={panelOpen}
            onClose={handleClosePanel}
            accentColor={theme.accent}
          />
        </div>

        {/* User info */}
        <div
          className="flex items-center gap-2.5 pl-3 ml-1.5 border-l border-border"
          aria-label={`Logged in as ${currentUser?.name}`}
        >
          <Avatar initials={currentUser?.initials ?? '??'} size="md" />
          <div className="hidden sm:block">
            <div className="text-[0.83rem] font-semibold text-foreground leading-tight">{currentUser?.name}</div>
            <span className={`inline-flex items-center gap-1 text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full leading-none ${theme.badgeCls}`}>
              <i className={`${theme.icon} text-[0.6rem]`} aria-hidden="true" />
              {theme.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
