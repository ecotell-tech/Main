import { useRef, useState } from 'react';
import { useOtpTimer } from '@hooks/useOtpTimer';
import { useToast }    from '@hooks/useToast';
import { APP_CONFIG }  from '@constants/appConfig';

const OTP_LENGTH = APP_CONFIG.otp.lengthDigits;

/**
 * OtpLoginForm — two-step OTP authentication flow.
 *
 * @param {Function} onSuccess - Called after successful OTP verification.
 */
export default function OtpLoginForm({ onSuccess }) {
  const { showToast } = useToast();

  const [step,          setStep]          = useState(1); // 1 = enter mobile, 2 = enter OTP
  const [otpMobile,     setOtpMobile]     = useState('');
  const [otpDigits,     setOtpDigits]     = useState(Array(OTP_LENGTH).fill(''));
  const [mobileError,   setMobileError]   = useState('');
  const [isSending,     setIsSending]     = useState(false);
  const [isVerifying,   setIsVerifying]   = useState(false);

  const inputRefs = useRef([]);

  const { formattedTime, isExpired, startTimer } = useOtpTimer(
    APP_CONFIG.otp.expirySeconds,
    () => showToast('OTP expired. Please request a new one.', 'warning')
  );

  /* ── Step 1: Send OTP ─────────────────────────────────── */
  async function handleSendOtp() {
    if (!otpMobile || !/^\d{10}$/.test(otpMobile)) {
      setMobileError('Enter a valid 10-digit mobile number.');
      return;
    }
    setMobileError('');
    setIsSending(true);
    await new Promise((res) => setTimeout(res, 800));
    setIsSending(false);
    setStep(2);
    startTimer();
    showToast(`OTP sent to ${otpMobile}`, 'success');
  }

  /* ── OTP box keyboard navigation ─────────────────────── */
  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otpDigits];
    updated[index] = value;
    setOtpDigits(updated);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setOtpDigits(pasted.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
    e.preventDefault();
  }

  /* ── Step 2: Verify OTP ───────────────────────────────── */
  async function handleVerifyOtp() {
    const otp = otpDigits.join('');
    if (otp.length < OTP_LENGTH) {
      showToast('Please enter all 6 OTP digits.', 'warning');
      return;
    }
    setIsVerifying(true);
    await new Promise((res) => setTimeout(res, 800));
    setIsVerifying(false);
    // Demo: any complete OTP is accepted
    showToast('OTP verified. Welcome back!', 'success');
    onSuccess?.();
  }

  function handleResend() {
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    startTimer();
    showToast(`OTP resent to ${otpMobile}`, 'success');
  }

  /* ── Step 1 UI ─────────────────────────────────────── */
  if (step === 1) {
    return (
      <div id="panelOtp" className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground" htmlFor="otpMobile">Mobile Number</label>
          <div className="relative flex items-center">
            <i className="fas fa-mobile-alt absolute left-3 text-muted-foreground text-sm pointer-events-none" aria-hidden="true" />
            <input
              type="tel"
              id="otpMobile"
              className={`w-full pl-9 pr-3 py-2 h-9 rounded-lg border text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${mobileError ? 'border-destructive' : 'border-input'}`}
              placeholder="10-digit registered mobile"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
              value={otpMobile}
              onChange={(e) => { setOtpMobile(e.target.value); setMobileError(''); }}
            />
          </div>
          {mobileError && <p className="text-destructive text-xs mt-1">{mobileError}</p>}
          <p className="text-muted-foreground text-xs mt-1">OTP will be sent to this number via SMS</p>
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-900 disabled:opacity-60 disabled:pointer-events-none transition-colors"
          onClick={handleSendOtp}
          disabled={isSending}
          aria-busy={isSending}
        >
          {isSending
            ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Sending…</>
            : <><i className="fas fa-paper-plane" aria-hidden="true" /> Send OTP</>
          }
        </button>
      </div>
    );
  }

  /* ── Step 2 UI ─────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Sent confirmation strip */}
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
        <i className="fas fa-check-circle text-green-600 text-lg shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-green-800">OTP Sent Successfully</div>
          <div className="text-xs text-green-700">
            Sent to <span className="font-bold">{otpMobile}</span>
          </div>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline shrink-0"
          onClick={() => setStep(1)}
        >
          Change
        </button>
      </div>

      {/* OTP digit boxes */}
      <div>
        <label className="block text-xs font-semibold mb-2 text-foreground">Enter {OTP_LENGTH}-digit OTP</label>
        <div className="flex gap-2 justify-center" onPaste={handleOtpPaste} aria-label="OTP input">
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              className="otp-box"
              type="text"
              maxLength={1}
              inputMode="numeric"
              pattern="[0-9]"
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              aria-label={`OTP digit ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Timer + resend */}
      <div className="flex items-center justify-between text-xs">
        {!isExpired
          ? <span className="text-muted-foreground">OTP expires in <span className="font-bold text-primary">{formattedTime}</span></span>
          : <span className="text-destructive font-medium">OTP expired</span>
        }
        <button
          type="button"
          className="text-primary font-semibold hover:underline disabled:text-muted-foreground disabled:no-underline disabled:pointer-events-none"
          onClick={handleResend}
          disabled={!isExpired}
        >
          <i className="fas fa-redo" aria-hidden="true" /> Resend OTP
        </button>
      </div>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-900 disabled:opacity-60 disabled:pointer-events-none transition-colors"
        onClick={handleVerifyOtp}
        disabled={isVerifying || isExpired}
        aria-busy={isVerifying}
      >
        {isVerifying
          ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Verifying…</>
          : <><i className="fas fa-shield-alt" aria-hidden="true" /> Verify &amp; Sign In</>
        }
      </button>
    </div>
  );
}
