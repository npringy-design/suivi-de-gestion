import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';

export type LongPressPoint = { x: number; y: number };

export type LongPressHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
};

export type BindLongPress = (onLongPress: (point: LongPressPoint) => void, disabled?: boolean) => LongPressHandlers;

type LongPressOptions = {
  delayMs?: number;
  // Au-delà de ce déplacement (px) l'appui est annulé : sélection de texte, défilement tactile…
  moveTolerancePx?: number;
};

// Clic maintenu à la souris et au doigt (événements pointer, pas de drag HTML5). Un seul appui est suivi à la fois :
// `bind(callback)` renvoie les gestionnaires à poser sur l'élément visé. Les boutons de l'élément sont ignorés.
export function useLongPress({ delayMs = 500, moveTolerancePx = 8 }: LongPressOptions = {}): BindLongPress {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<LongPressPoint | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return useCallback<BindLongPress>((onLongPress, disabled = false) => ({
    onPointerDown: event => {
      if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (event.target instanceof Element && event.target.closest('button')) return;

      cancel();
      const point = { x: event.clientX, y: event.clientY };
      startRef.current = point;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        startRef.current = null;
        onLongPress(point);
      }, delayMs);
    },
    onPointerMove: event => {
      const start = startRef.current;
      if (!start || timerRef.current === null) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > moveTolerancePx) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  }), [cancel, delayMs, moveTolerancePx]);
}
