import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

interface UseMapExpandOptions {
  collapsedRadius?: string;
  durationMs?: number;
}

/**
 * Điều khiển hiệu ứng phóng to / thu nhỏ bản đồ mượt tại chỗ bằng transform (FLIP):
 * giữ nguyên khung slot gốc trong layout và scale trực tiếp về đúng vị trí slot khi thu gọn,
 * tránh lỗi trượt lên trên do transition-all giữa position relative và fixed.
 */
export function useMapExpandAnimation(
  onSettled?: () => void,
  options?: UseMapExpandOptions
) {
  const collapsedRadius = options?.collapsedRadius ?? '12px';
  const durationMs = options?.durationMs ?? 270;

  const slotRef = useRef<HTMLDivElement>(null);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isFixedLayer, setIsFixedLayer] = useState(false);
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});

  const genRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearScheduled = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => clearScheduled(), [clearScheduled]);

  const computeSlotTransform = useCallback(() => {
    const rect = slotRef.current?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect || rect.width <= 0 || rect.height <= 0 || vw <= 0 || vh <= 0) {
      return null;
    }
    const sx = rect.width / vw;
    const sy = rect.height / vh;
    const dx = rect.left + rect.width / 2 - vw / 2;
    const dy = rect.top + rect.height / 2 - vh / 2;
    return `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
  }, []);

  const toggleExpanded = useCallback(() => {
    clearScheduled();
    const gen = ++genRef.current;
    const next = !isExpanded;
    const slotTransform = computeSlotTransform();

    if (next) {
      setIsExpanded(true);
      setIsFixedLayer(true);

      if (!slotTransform) {
        setBoxStyle({});
        rafRef.current = requestAnimationFrame(() => onSettledRef.current?.());
        return;
      }

      setBoxStyle({
        transform: slotTransform,
        transformOrigin: 'center center',
        borderRadius: collapsedRadius,
        transition: 'none',
        willChange: 'transform',
      });

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          if (genRef.current !== gen) return;
          setBoxStyle({
            transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
            transformOrigin: 'center center',
            borderRadius: '0px',
            transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-radius ${durationMs}ms ease`,
            willChange: 'transform',
          });
          timerRef.current = setTimeout(() => {
            if (genRef.current !== gen) return;
            setBoxStyle({});
            onSettledRef.current?.();
          }, durationMs + 20);
        });
      });
      return;
    }

    // Thu nhỏ: giữ fixed layer và thu scale/vị trí về đúng khung slot gốc
    setIsExpanded(false);

    if (!slotTransform) {
      setIsFixedLayer(false);
      setBoxStyle({});
      rafRef.current = requestAnimationFrame(() => onSettledRef.current?.());
      return;
    }

    setIsFixedLayer(true);
    setBoxStyle({
      transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
      transformOrigin: 'center center',
      borderRadius: '0px',
      transition: 'none',
      willChange: 'transform',
    });

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        if (genRef.current !== gen) return;
        setBoxStyle({
          transform: slotTransform,
          transformOrigin: 'center center',
          borderRadius: collapsedRadius,
          transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), border-radius ${durationMs}ms ease`,
          willChange: 'transform',
        });
        timerRef.current = setTimeout(() => {
          if (genRef.current !== gen) return;
          setIsFixedLayer(false);
          setBoxStyle({});
          rafRef.current = requestAnimationFrame(() => onSettledRef.current?.());
        }, durationMs + 20);
      });
    });
  }, [clearScheduled, collapsedRadius, computeSlotTransform, durationMs, isExpanded]);

  return {
    slotRef,
    isExpanded,
    isFixedLayer,
    boxStyle,
    toggleExpanded,
  };
}
