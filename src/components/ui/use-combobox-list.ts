"use client";

import { useCallback, useState } from "react";

/**
 * Shared keyboard/focus helpers for typeahead listboxes (FQA-008).
 * Active index is derived from open/optionCount — no sync effects.
 */
export function useComboboxList(optionCount: number, open: boolean) {
  const [rawIndex, setRawIndex] = useState(-1);

  const activeIndex =
    !open || optionCount === 0 || rawIndex < 0
      ? -1
      : Math.min(rawIndex, optionCount - 1);

  const setActiveIndex = setRawIndex;

  const onKeyDown = useCallback(
    (
      event: React.KeyboardEvent,
      handlers: {
        onSelectIndex: (index: number) => void;
        onClose: () => void;
        onOpen?: () => void;
      },
    ) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        handlers.onOpen?.();
        if (optionCount === 0) return;
        setRawIndex((current) => {
          const base =
            !open || current < 0
              ? -1
              : Math.min(current, optionCount - 1);
          return base < 0 ? 0 : (base + 1) % optionCount;
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        handlers.onOpen?.();
        if (optionCount === 0) return;
        setRawIndex((current) => {
          const base =
            !open || current < 0
              ? -1
              : Math.min(current, optionCount - 1);
          return base <= 0 ? optionCount - 1 : base - 1;
        });
        return;
      }
      if (event.key === "Enter") {
        const index =
          !open || optionCount === 0
            ? -1
            : Math.min(Math.max(rawIndex, 0), optionCount - 1);
        if (open && index >= 0) {
          event.preventDefault();
          handlers.onSelectIndex(index);
        }
        return;
      }
      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          handlers.onClose();
        }
      }
    },
    [open, optionCount, rawIndex],
  );

  return { activeIndex, setActiveIndex, onKeyDown };
}
