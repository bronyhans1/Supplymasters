"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchReturnableDeliveriesAction } from "@/lib/returns/actions";
import type { ReturnableDeliveryOption } from "@/lib/returns/queries";
import { formControlClass } from "@/components/ui/form-styles";
import { useComboboxList } from "@/components/ui/use-combobox-list";
import { cn } from "@/lib/utils/cn";

const DEBOUNCE_MS = 220;

function optionLabel(delivery: ReturnableDeliveryOption): string {
  const parts = [delivery.delivery_ref];
  if (delivery.vendor_name) parts.push(delivery.vendor_name);
  if (delivery.supply_ref) parts.push(delivery.supply_ref);
  parts.push(delivery.status);
  return parts.join(" · ");
}

/**
 * Searchable picker for FAILED/CANCELLED deliveries when recording a stock return.
 */
export function ReturnableDeliveryPicker({
  disabled = false,
  onPick,
}: {
  disabled?: boolean;
  onPick: (delivery: ReturnableDeliveryOption) => void;
}) {
  const listId = useId();
  const labelId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnableDeliveryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const { activeIndex, setActiveIndex, onKeyDown } = useComboboxList(
    results.length,
    open,
  );

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        const result = await searchReturnableDeliveriesAction({
          q: query.trim(),
        });
        if (seq !== requestSeq.current) return;
        if (!result.ok) {
          setError(result.error);
          setResults([]);
          return;
        }
        setError(null);
        setResults(result.deliveries);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  function pick(delivery: ReturnableDeliveryOption) {
    onPick(delivery);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      <label id={labelId} className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Delivery
        </span>
        <input
          value={query}
          disabled={disabled}
          placeholder="Search delivery, supply, or vendor"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) =>
            onKeyDown(event, {
              onOpen: () => setOpen(true),
              onClose: () => setOpen(false),
              onSelectIndex: (index) => {
                const delivery = results[index];
                if (delivery) pick(delivery);
              },
            })
          }
          className={formControlClass}
        />
      </label>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
        >
          {pending && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted" role="status">
              Searching…
            </p>
          ) : null}
          {error ? (
            <p className="px-3 py-2 text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}
          {!pending && !error && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted" role="status">
              {query.trim()
                ? "No matching FAILED or CANCELLED deliveries."
                : "Type a delivery, supply, or vendor to search."}
            </p>
          ) : null}
          {results.map((delivery, index) => (
            <button
              key={delivery.id}
              id={`${listId}-opt-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              disabled={disabled}
              className={cn(
                "block w-full px-3 py-2.5 text-left text-sm text-ink",
                "hover:bg-paper focus-visible:bg-paper focus-visible:outline-none",
                index === activeIndex && "bg-paper",
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(delivery)}
            >
              {optionLabel(delivery)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
