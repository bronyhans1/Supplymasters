"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchReturnDeliveriesAction } from "@/lib/returns/actions";
import type { ReturnDeliveryFilterOption } from "@/lib/returns/queries";
import { formControlClass } from "@/components/ui/form-styles";
import { useComboboxList } from "@/components/ui/use-combobox-list";
import { cn } from "@/lib/utils/cn";

const DEBOUNCE_MS = 220;

/**
 * Searchable delivery filter for returns — never dumps the full return-delivery catalog.
 */
export function DeliveryFilterPicker({
  name = "deliveryId",
  initialSelected = null,
  disabled = false,
  label = "Delivery",
}: {
  name?: string;
  initialSelected?: ReturnDeliveryFilterOption | null;
  disabled?: boolean;
  label?: string;
}) {
  const listId = useId();
  const labelId = useId();
  const [selected, setSelected] = useState<ReturnDeliveryFilterOption | null>(
    initialSelected,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnDeliveryFilterOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const { activeIndex, setActiveIndex, onKeyDown } = useComboboxList(
    results.length,
    open && !selected,
  );

  useEffect(() => {
    if (!open || selected) return;
    const handle = window.setTimeout(() => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        const result = await searchReturnDeliveriesAction({
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
  }, [query, open, selected]);

  function pick(delivery: ReturnDeliveryFilterOption) {
    setSelected(delivery);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      <span
        id={labelId}
        className="text-xs font-medium uppercase tracking-wide text-muted"
      >
        {label}
      </span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
          <span className="min-w-0 truncate text-ink">{selected.label}</span>
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-accent hover:underline"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setResults([]);
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <input
          value={query}
          disabled={disabled}
          placeholder="Search delivery reference"
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
      )}
      {open && !selected ? (
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
                ? "No matching deliveries with returns."
                : "Type a delivery reference to search."}
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
              {delivery.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
