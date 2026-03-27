// src/hooks/useFooterOffset.ts

import { useEffect, useRef, useState } from 'react';

export function useFooterOffset() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [bottomOffset, setBottomOffset] = useState(24);

  useEffect(() => {
    const init = () => {
      const footer = document.querySelector('footer');
      if (!footer) return;
      footerRef.current = footer as HTMLElement;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const visibleHeight = entry.intersectionRect.height;
            setBottomOffset(visibleHeight + 16);
          } else {
            setBottomOffset(24);
          }
        },
        {
          threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        }
      );

      observer.observe(footer);
      return () => observer.disconnect();
    };

    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, []);

  return { bottomOffset };
}