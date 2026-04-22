
import { useEffect, useRef } from 'react';

/**
 * Hook to detect user inactivity and trigger a callback (e.g., logout/lock).
 * Used for HIPAA Automatic Logoff implementation.
 */
export function useInactivity(timeoutMinutes: number, onTimeout: () => void) {
  const timerRef = useRef<any>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep callback fresh
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    // If disabled (0), cleanup and return
    if (timeoutMinutes <= 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
          onTimeoutRef.current();
      }, timeoutMinutes * 60 * 1000);
    };

    // Events to track activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Attach listeners
    events.forEach(e => window.addEventListener(e, resetTimer));
    
    // Initial start
    resetTimer();

    // Cleanup
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [timeoutMinutes]);
}
