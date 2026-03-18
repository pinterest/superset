/**
 * Stub for dashboard list extensions (search filters, extra columns).
 * Internal build replaces this with the real implementation.
 */
import { Filter } from 'src/components/ListView/types';

/** Extra search filters to add to the dashboard list (e.g. tier, nimbus_project). */
export function getDashboardListSearchFilters(): Filter[] {
  return [];
}

/** Extra column names to request from the dashboard list API (e.g. tier, nimbus_project). */
export function getDashboardListExtraColumnsToFetch(): string[] {
  return [];
}

/** Extra table column configs for the dashboard list (e.g. Tier, Nimbus Project). */
export function getDashboardListExtraListColumns(): object[] {
  return [];
}
