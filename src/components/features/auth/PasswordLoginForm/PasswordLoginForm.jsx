import { useState, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@hooks/useToast';
import { cn } from '@/lib/utils';

export default function PasswordLoginForm({ onSuccess, prefill }) {
  const { signIn }      = useAuth();
  const { showToast }   = useToast();

  const [mobile,       setMobile]       = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors,       setErrors]       = useState({});
  const [isLoading,    setIsLoading]    = useState(false);

  // Auto-fill when a demo credential is selected
  useEffect(() => {
    if (prefill) {
      setMobile(prefill.mobile ?? '');
      setPassword(prefill.password ?? '');
      setErrors({});
    }
  }, [prefill]);

  function validate() {
    const newErrors = {};
    if (!mobile || !/^\d{10}$/.test(mobile))
      newErrors.mobile = 'Enter a valid 10-digit mobile number.';
    if (!password || password.length < 4)
      newErrors.password = 'Enter your password (min. 4 characters).';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 600));
    const result = await signIn(mobile, password);
    setIsLoading(false);
    if (result.success) {
      showToast('Signed in successfully. Welcome back!', 'success');
      onSuccess?.();
    } else {
      setErrors({ mobile: result.error });
      showToast(result.error, 'error');
    }
  }

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  const inputBase = 'w-full pl-9 pr-3 py-2 h-9 rounded-lg border text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors';

  return (
    <form id="loginForm" onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* Mobile number */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-foreground" htmlFor="mobile">Mobile Number</label>
        <div className="relative flex items-center">
          <i className="fas fa-mobile-alt absolute left-3 text-muted-foreground text-sm pointer-events-none" aria-hidden="true" />
          <input
            type="tel"
            id="mobile"
            className={cn(inputBase, errors.mobile ? 'border-destructive focus-visible:ring-destructive/30' : 'border-input')}
            placeholder="10-digit mobile number"
            maxLength={10}
            inputMode="numeric"
            autoComplete="username"
            value={mobile}
            onChange={(e) => { setMobile(e.target.value); clearError('mobile'); }}
          />
        </div>
        {errors.mobile && <p className="text-destructive text-xs mt-1">{errors.mobile}</p>}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground" htmlFor="password">Password</label>
          <a href="#" className="text-xs text-primary hover:underline" onClick={(e) => e.preventDefault()}>Forgot password?</a>
        </div>
        <div className="relative flex items-center">
          <i className="fas fa-lock absolute left-3 text-muted-foreground text-sm pointer-events-none" aria-hidden="true" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            className={cn(inputBase, 'pr-9', errors.password ? 'border-destructive focus-visible:ring-destructive/30' : 'border-input')}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
          />
          <button
            type="button"
            className="absolute right-3 text-muted-foreground hover:text-foreground text-sm"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
          </button>
        </div>
        {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-900 disabled:opacity-60 disabled:pointer-events-none transition-colors"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading
          ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Signing in...</>
          : <><i className="fas fa-sign-in-alt" aria-hidden="true" /> Sign In</>
        }
      </button>
    </form>
  );
}
