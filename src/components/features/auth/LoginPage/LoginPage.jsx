import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '@context/AuthContext';
import { ROUTES }      from '@constants/routes';
import { APP_CONFIG }  from '@constants/appConfig';
import LoginBrandPanel     from '@features/auth/LoginBrandPanel/LoginBrandPanel';
import PasswordLoginForm   from '@features/auth/PasswordLoginForm/PasswordLoginForm';
import OtpLoginForm        from '@features/auth/OtpLoginForm/OtpLoginForm';

const LOGIN_METHOD = Object.freeze({ PASSWORD: 'password', OTP: 'otp' });

const DEMO_CREDS = [
  { role: 'Farmer Representative', mobile: '9579263798', password: '9579263798',     color: 'text-green-700'  },
  { role: 'Team Lead',             mobile: '9000000001', password: 'Sup@2026',       color: 'text-blue-700'   },
  { role: 'Manager',               mobile: '9000000002', password: 'Admin@2026',     color: 'text-purple-700' },
  { role: 'Data Entry Operator',   mobile: '9000000003', password: 'DataEntry@2026', color: 'text-amber-700'  },
  { role: 'Leadership',            mobile: '9000000004', password: 'Manager@2026',   color: 'text-rose-700'   },
];

function DemoCredentialsPanel({ onFill }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-800"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span><i className="fas fa-key mr-1.5" />Demo Credentials (Dev Only)</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} opacity-60`} />
      </button>
      {open && (
        <div className="border-t border-dashed border-amber-300 divide-y divide-amber-200">
          {DEMO_CREDS.map(({ role, mobile, password, color }) => (
            <button
              key={mobile}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-amber-100 transition-colors"
              onClick={() => onFill(mobile, password)}
            >
              <div className={`text-[0.72rem] font-semibold ${color}`}>{role}</div>
              <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                {mobile} / {password}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [activeMethod, setActiveMethod] = useState(LOGIN_METHOD.PASSWORD);
  const [isMobile,     setIsMobile]     = useState(false);
  const [prefill,      setPrefill]      = useState(null);

  function handleDemoFill(mobile, password) {
    setActiveMethod(LOGIN_METHOD.PASSWORD);
    setPrefill({ mobile, password });
  }

  useEffect(() => {
    if (isAuthenticated) navigate(ROUTES.abs.dashboard, { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function handleAuthSuccess() {
    navigate(ROUTES.abs.dashboard, { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand panel */}
      <LoginBrandPanel />

      {/* Right: Login form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">

          {/* Mobile-only logo bar */}
          {isMobile && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <img src={APP_CONFIG.brand.logoSrc} alt={`${APP_CONFIG.brand.name} logo`} className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground font-heading">{APP_CONFIG.brand.name}</div>
                <div className="text-xs text-muted-foreground">{APP_CONFIG.brand.tagline}</div>
              </div>
            </div>
          )}

          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground font-heading">Welcome Back 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your portal dashboard</p>
          </div>

          {/* Method tabs */}
          <div className="flex rounded-xl bg-muted p-1 mb-6" role="tablist" aria-label="Login method">
            {[
              { method: LOGIN_METHOD.PASSWORD, icon: 'fas fa-lock',       label: 'Password Login' },
              { method: LOGIN_METHOD.OTP,      icon: 'fas fa-mobile-alt', label: 'OTP Login' },
            ].map(({ method, icon, label }) => (
              <button
                key={method}
                role="tab"
                aria-selected={activeMethod === method}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
                  activeMethod === method
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveMethod(method)}
              >
                <i className={icon} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {/* Active form */}
          <div role="tabpanel">
            {activeMethod === LOGIN_METHOD.PASSWORD
              ? <PasswordLoginForm onSuccess={handleAuthSuccess} prefill={prefill} />
              : <OtpLoginForm      onSuccess={handleAuthSuccess} />
            }
          </div>

          {/* Demo credentials (dev only) */}
          {import.meta.env.VITE_APP_ENV === 'development' && (
            <DemoCredentialsPanel onFill={handleDemoFill} />
          )}

          {/* Security note */}
          <div className="flex items-center gap-2 mt-5 p-3 rounded-xl bg-green-50 border border-green-100 text-xs text-green-800">
            <i className="fas fa-shield-alt text-green-600" aria-hidden="true" />
            <span>Your connection is encrypted. Role-based access is enforced.</span>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>&copy; {APP_CONFIG.brand.year} {APP_CONFIG.brand.name}. All rights reserved.</p>
            <p className="mt-0.5">
              Developed by{' '}
              <a
                href="https://techyogi.in"
                className="text-primary font-semibold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {APP_CONFIG.brand.developer}
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
