"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchActiveProductsAction } from "@/lib/products/actions";
import type {
  ProductFilterOption,
  ProductOption,
} from "@/lib/products/options";
import { formControlClass } from "@/components/ui/form-styles";
import { useComboboxList } from "@/components/ui/use-combobox-list";
import { cn } from "@/lib/utils/cn";

const DEBOUNCE_MS = 220;

function optionLabel(product: ProductOption, includeStock: boolean): string {
  const base = `${product.name} · ${product.product_code}`;
  if (!includeStock) return base;
  const qty = product.quantity_on_hand ?? 0;
  return `${base} · ${qty} ${product.unit_of_measure} on hand`;
}

/**
 * Typeahead to pick a product for supply/purchase lines.
 * Loads options via server search — never embeds the full catalogue.
 */
export function ProductLinePicker({
  includeStock = false,
  excludeIds = [],
  disabled = false,
  onPick,
}: {
  includeStock?: boolean;
  excludeIds?: string[];
  disabled?: boolean;
  onPick: (product: ProductOption) => void;
}) {
  const listId = useId();
  const labelId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const excludeKey = excludeIds.join(",");
  const { activeIndex, setActiveIndex, onKeyDown } = useComboboxList(
    results.length,
    open,
  );

  useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(() => {
      const seq = ++requestSeq.current;
      const excluded = excludeKey ? excludeKey.split(",") : [];
      startTransition(async () => {
        const result = await searchActiveProductsAction({
          q: query.trim(),
          includeStock,
          excludeIds: excluded,
        });
        if (seq !== requestSeq.current) return;
        if (!result.ok) {
          setError(result.error);
          setResults([]);
          return;
        }
        setError(null);
        setResults(result.products);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, includeStock, excludeKey, open]);

  function pick(product: ProductOption) {
    onPick(product);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      <label id={labelId} className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search products
        </span>
        <input
          value={query}
          disabled={disabled}
          placeholder="Name or code"
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
                const product = results[index];
                if (product) pick(product);
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
                ? "No matching active products."
                : "Type a name or code to search active products."}
            </p>
          ) : null}
          {results.map((product, index) => (
            <button
              key={product.id}
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
              onClick={() => pick(product)}
            >
              {optionLabel(product, includeStock)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Filter control: searchable product id for GET forms (reports/returns).
 * Writes a hidden `name` input; keeps selected label without dumping the catalogue.
 * Remount via `key` when the URL-selected product changes.
 */
export function ProductFilterPicker({
  name = "productId",
  initialSelected = null,
  disabled = false,
  label = "Product",
}: {
  name?: string;
  initialSelected?: ProductFilterOption | null;
  disabled?: boolean;
  label?: string;
}) {
  const listId = useId();
  const labelId = useId();
  const [selected, setSelected] = useState<ProductFilterOption | null>(
    initialSelected,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
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
        const result = await searchActiveProductsAction({
          q: query.trim(),
          includeStock: false,
        });
        if (seq !== requestSeq.current) return;
        if (!result.ok) {
          setError(result.error);
          setResults([]);
          return;
        }
        setError(null);
        setResults(result.products);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, open, selected]);

  function pick(product: ProductOption) {
    setSelected({
      id: product.id,
      label: `${product.product_code} · ${product.name}`,
    });
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
          placeholder="Search product name or code"
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
                const product = results[index];
                if (product) pick(product);
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
                ? "No matching active products."
                : "Type a name or code to search active products."}
            </p>
          ) : null}
          {results.map((product, index) => (
            <button
              key={product.id}
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
              onClick={() => pick(product)}
            >
              {product.product_code} · {product.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
