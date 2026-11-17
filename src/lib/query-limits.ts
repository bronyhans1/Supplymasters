/**
 * Shared caps for list search ID expansion and filter catalogs.
 * Keeps request payloads bounded without truncating paginated result sets.
 */

/** Max IDs collected from each text-match scope query (vendors, supplies, etc.). */
export const SEARCH_SCOPE_ID_LIMIT = 75;

/** Max rows for static filter dropdown catalogs (aligned with reports). */
export const FILTER_OPTION_LIMIT = 200;

/** Max rows for typeahead filter searches. */
export const FILTER_SEARCH_LIMIT = 25;
