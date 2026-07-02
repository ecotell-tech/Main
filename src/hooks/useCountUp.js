import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric counter from 0 to `target` over `duration` ms.
 * Uses requestAnimationFrame for smooth, GPU-friendly animation.
 *
 * @param {number} target    - Final number to count to.
 * @param {number} duration  - Animation duration in ms (default 1200).
 * @returns {number}           The current animated value.
 */
export function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef  = useRef(null);
  const startRef  = useRef(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;

      const elapsed  = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      startRef.current = null;
    };
  }, [target, duration]);

  return count;
}
