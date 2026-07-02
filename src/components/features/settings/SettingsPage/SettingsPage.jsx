import { useState, useEffect } from 'react';
import Button         from '@common/Button/Button';
import { useAuth }    from '@context/AuthContext';
import { useToast }   from '@hooks/useToast';
import { useRoleTheme } from '@hooks/useRoleTheme';
import FORM_OPTIONS   from '@data/config/formOptions.json';

const NOTIF_OPTIONS = FORM_OPTIONS.notificationOptions;

const ROLE_LABEL = {
  manager:             'Leadership',
  admin:               'Manager',
  team_lead:           'Team Lead',
  supervisor:          'Team Lead',
  agronomist:          'Field Representative',
  data_entry_operator: 'Data Entry Operator',
};

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: 'fas fa-user'         },
  { id: 'security',      label: 'Security',       icon: 'fas fa-lock'         },
  { id: 'notifications', label: 'Notifications',  icon: 'fas fa-bell'         },
];

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  return TABS.find(t => t.id === hash)?.id ?? 'profile';
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-bold text-foreground">{children}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, value, colSpan = 1 }) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-1.5 text-foreground">{label}</label>
      <div className="w-full h-9 px-3 rounded-lg border border-input bg-muted/40 text-sm text-muted-foreground flex items-center truncate">
        {value || <span className="italic opacity-50">—</span>}
      </div>
    </div>
  );
}

function PwdInput({ label, field, value, show, onChange, onToggle, error, success }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-foreground">{label}</label>
      <div className="relative flex items-center">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field === 'current' ? 'Enter current password' : field === 'next' ? 'Minimum 8 characters' : 'Re-enter new password'}
          className={`flex-1 h-9 pl-3 pr-9 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-colors
            ${error   ? 'border-red-400 focus:ring-red-300 bg-red-50'
            : success ? 'border-green-400 focus:ring-green-300 bg-green-50'
                      : 'border-input bg-card focus:ring-ring'}`}
          autoComplete={field === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <i className={`fas fa-eye${show ? '-slash' : ''} text-xs`} />
        </button>
      </div>
      {error   && <p className="text-xs text-red-500 mt-1"><i className="fas fa-xmark mr-1" />{error}</p>}
      {success && <p className="text-xs text-green-600 mt-1"><i className="fas fa-check mr-1" />{success}</p>}
    </div>
  );
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function ProfilePanel({ currentUser }) {
  return (
    <div className="space-y-6">
      <SectionTitle sub="Your account information, managed by your administrator.">
        Profile Information
      </SectionTitle>

      {/* Avatar + name banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shrink-0"
          style={{ background: currentUser?.avatarColor ?? 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
        >
          {currentUser?.initials ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-foreground truncate">{currentUser?.name}</div>
          <div className="text-xs text-muted-foreground">{ROLE_LABEL[currentUser?.role] ?? currentUser?.role}</div>
          {currentUser?.email && (
            <div className="text-xs text-muted-foreground mt-0.5">{currentUser.email}</div>
          )}
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name"     value={currentUser?.name}   />
        <Field label="Mobile Number" value={currentUser?.mobile} />
        <Field label="Role"          value={ROLE_LABEL[currentUser?.role] ?? currentUser?.role} />
        {currentUser?.designation && (
          <Field label="Designation" value={currentUser.designation} />
        )}
        {currentUser?.territory && (
          <Field label="Territory"   value={currentUser.territory} colSpan={2} />
        )}
        {currentUser?.email && (
          <Field label="Email"       value={currentUser.email}   colSpan={2} />
        )}
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
        <i className="fas fa-circle-info shrink-0" />
        Profile details are managed by your administrator. Contact support to request changes.
      </div>
    </div>
  );
}

function SecurityPanel({ changePassword }) {
  const { showToast } = useToast();
  const [form,     setForm]     = useState({ current: '', next: '', confirm: '' });
  const [loading,  setLoading]  = useState(false);
  const [show,     setShow]     = useState({ current: false, next: false, confirm: false });

  const score = [
    form.next.length >= 8,
    /[A-Z]/.test(form.next),
    /[0-9]/.test(form.next),
    /[^A-Za-z0-9]/.test(form.next),
  ].filter(Boolean).length;

  const strengthColor = score <= 1 ? '#ef4444' : score <= 2 ? '#d97706' : score === 3 ? '#2563eb' : '#16a34a';
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'][score];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.current)                        { showToast('Enter your current password.',           'error'); return; }
    if (form.next.length < 8)                 { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (form.next !== form.confirm)           { showToast('Passwords do not match.',                'error'); return; }
    if (form.next === form.current)           { showToast('New password must differ from current.', 'error'); return; }
    setLoading(true);
    const result = await changePassword(form.current, form.next);
    setLoading(false);
    if (result.success) {
      showToast('Password changed successfully.', 'success');
      setForm({ current: '', next: '', confirm: '' });
    } else {
      showToast(result.error ?? 'Failed to change password.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="Use at least 8 characters with letters, numbers, and symbols.">
        Change Password
      </SectionTitle>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" autoComplete="off">
        <PwdInput
          label="Current Password"
          field="current"
          value={form.current}
          show={show.current}
          onChange={v => setForm(p => ({ ...p, current: v }))}
          onToggle={() => setShow(p => ({ ...p, current: !p.current }))}
        />

        <PwdInput
          label="New Password"
          field="next"
          value={form.next}
          show={show.next}
          onChange={v => setForm(p => ({ ...p, next: v }))}
          onToggle={() => setShow(p => ({ ...p, next: !p.next }))}
        />

        {/* Strength meter */}
        {form.next.length > 0 && (
          <div className="space-y-1 -mt-2">
            <div className="flex gap-1">
              {[1,2,3,4].map(i => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-300"
                  style={{ background: i <= score ? strengthColor : '#e5e7eb' }}
                />
              ))}
            </div>
            <div className="text-xs font-medium" style={{ color: strengthColor }}>
              {strengthLabel}
            </div>
          </div>
        )}

        <PwdInput
          label="Confirm New Password"
          field="confirm"
          value={form.confirm}
          show={show.confirm}
          onChange={v => setForm(p => ({ ...p, confirm: v }))}
          onToggle={() => setShow(p => ({ ...p, confirm: !p.confirm }))}
          error={form.confirm && form.next !== form.confirm ? 'Passwords do not match' : ''}
          success={form.confirm && form.next === form.confirm && form.next.length >= 8 ? 'Passwords match' : ''}
        />

        <div className="pt-1">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin mr-2" />Updating…</>
              : <><i className="fas fa-key mr-2" />Update Password</>}
          </Button>
        </div>
      </form>

      {/* Tips */}
      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold text-foreground mb-3">Password tips</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {[
            'At least 8 characters long',
            'Mix of uppercase and lowercase letters',
            'Include at least one number (0–9)',
            'Add a special character (!@#$%^&*)',
          ].map(tip => (
            <li key={tip} className="flex items-center gap-2">
              <i className="fas fa-circle-check text-green-500 text-[0.6rem]" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const { showToast } = useToast();
  const NOTIF_KEY = 'pscms_notification_prefs';

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { visitReminders: true, planUpdates: true, newAssignments: false };
  });
  const [dirty, setDirty] = useState(false);

  function toggle(key) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  function handleSave() {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    showToast('Notification preferences saved.', 'success');
    setDirty(false);
  }

  function handleReset() {
    const defaults = { visitReminders: true, planUpdates: true, newAssignments: false };
    setPrefs(defaults);
    setDirty(true);
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <SectionTitle sub="Choose which in-app notifications you want to receive.">
        Notification Preferences
      </SectionTitle>

      {/* Summary chip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <i className="fas fa-bell-slash text-[0.7rem]" />
        <span>{enabledCount} of {NOTIF_OPTIONS.length} notifications enabled</span>
      </div>

      {/* Toggle list */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {NOTIF_OPTIONS.map(({ key, label, desc }) => (
          <div
            key={key}
            className={`flex items-center justify-between px-4 py-4 transition-colors ${prefs[key] ? 'bg-primary/5' : 'bg-card'}`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${prefs[key] ? 'bg-primary/15' : 'bg-muted'}`}>
                <i className={`fas fa-bell text-xs ${prefs[key] ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${prefs[key] ? 'bg-primary' : 'bg-border'}`}
              aria-label={`Toggle ${label}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Reset to defaults
        </button>
        <Button variant="primary" onClick={handleSave} disabled={!dirty}>
          <i className="fas fa-save mr-2" />
          {dirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { currentUser, changePassword } = useAuth();
  const theme = useRoleTheme();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const PANELS = {
    profile:       <ProfilePanel currentUser={currentUser} />,
    security:      <SecurityPanel changePassword={changePassword} />,
    notifications: <NotificationsPanel />,
  };

  return (
    <div id="page-settings" className="space-y-4">

      {/* Page header */}
      <div>
        <div className="text-xl font-bold text-foreground font-heading">Settings</div>
        <div className="text-sm text-muted-foreground mt-0.5">Account, security and notification preferences</div>
      </div>

      {/* Default-password warning */}
      {currentUser?.isDefaultPassword && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <i className="fas fa-triangle-exclamation text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-bold text-amber-800">You are using the default password</div>
            <div className="text-xs text-amber-700 mt-0.5">
              Please update your password in the{' '}
              <button
                className="underline font-semibold"
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>{' '}
              tab to secure your account.
            </div>
          </div>
        </div>
      )}

      {/* Tab layout */}
      <div className="flex flex-col sm:flex-row gap-5 items-start">

        {/* Sidebar tabs */}
        <nav className="w-full sm:w-44 shrink-0">
          <ul className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <li key={tab.id} className="shrink-0">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                      ${active
                        ? 'text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    style={active ? { background: theme.accent } : {}}
                  >
                    <i className={`${tab.icon} text-xs w-4 text-center shrink-0`} />
                    <span>{tab.label}</span>
                    {active && (
                      <i className="fas fa-chevron-right ml-auto text-[0.6rem] opacity-70 hidden sm:block" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-border shadow-sm p-6">
          {PANELS[activeTab]}
        </div>

      </div>
    </div>
  );
}
