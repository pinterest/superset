/**
 * Stub for dashboard list extensions (search filters, extra columns).
 * Internal build replaces this with the real implementation.
 */
import { Filter } from 'src/components/ListView/types';

export interface DashboardListSearchFilterOptions {
  /** Show the Tier 1 Candidate filter (requires can_promote_tier_1 permission). */
  canPromoteTier1?: boolean;
}

/** Extra search filters to add to the dashboard list (e.g. tier, nimbus_project). */
export function getDashboardListSearchFilters(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: DashboardListSearchFilterOptions = {},
): Filter[] {
  return [];
}

export type DashboardListExtraColumnsOptions = {
  includeGovernance?: boolean;
};

/** Extra column names to request from the dashboard list API (e.g. tier, nimbus_project). */
export function getDashboardListExtraColumnsToFetch(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: DashboardListExtraColumnsOptions = {},
): string[] {
  return [];
}

/** Extra table column configs for the dashboard list (e.g. Tier, Nimbus Project). */
export function getDashboardListExtraListColumns(): object[] {
  return [];
}
