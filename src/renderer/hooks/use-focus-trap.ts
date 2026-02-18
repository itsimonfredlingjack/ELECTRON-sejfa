import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden'),
  );
}

function handleKeyDown(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const focusable = getFocusableElements(container);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }
  const idx = focusable.indexOf(active);
  if (idx === -1) return;
  if (e.shiftKey) {
    if (idx === 0) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (idx === focusable.length - 1) {
      e.preventDefault();
      first.focus();
    }
  }
}

export function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const el = containerRef.current;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusable = getFocusableElements(el);
    const firstFocusable = focusable[0];
    if (firstFocusable) {
      requestAnimationFrame(() => firstFocusable.focus());
    }

    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(el, e);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, containerRef]);
}
