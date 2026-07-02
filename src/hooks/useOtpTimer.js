import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown timer for OTP expiry.
 *
 * @param {number}  initialSeconds  - Total countdown seconds (default 120).
 * @param {Function} onExpire       - Callback fired when timer reaches zero.
 * @returns {{
 *   secondsLeft:  number,
 *   isExpired:    boolean,
 *   formattedTime: string,
 *   startTimer:   Function,
 *   resetTimer:   Function,
 * }}
 */
export function useOtpTimer(initialSeconds = 120, onExpire = () => {}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning,   setIsRunning]   = useState(false);
  const intervalRef = useRef(null);

  const clearTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startTimer = useCallback(() => {
    clearTimer();
    setSecondsLeft(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, onExpire]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return {
    secondsLeft,
    isExpired:    secondsLeft === 0 && !isRunning,
    formattedTime: `${mm}:${ss}`,
    startTimer,
    resetTimer,
  };
}
