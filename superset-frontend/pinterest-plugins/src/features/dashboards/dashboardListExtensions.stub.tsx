/**
 * Stub for dashboard list extensions (search filters, search mode, extra columns).
 * Internal build replaces this with the real implementation.
 */
import type { ReactNode } from 'react';
import {
  ListViewFilterOperator,
  type ListViewFilter,
} from 'src/components/ListView/types';

export interface DashboardListSearchFilterOptions {
  /** Show the Tier 1 Candidate filter (requires can_promote_tier_1 permission). */
  canPromoteTier1?: boolean;
}

/** Extra search filters to add to the dashboard list (e.g. tier, nimbus_project). */
export function getDashboardListSearchFilters(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: DashboardListSearchFilterOptions = {},
): ListViewFilter[] {
  return [];
}

export interface DashboardSearchMode {
  /** Initial operator for the dashboard name search. */
  searchOperator: ListViewFilterOperator;
  /** Control rendered beside the standard list filters. */
  renderSearchModeControl: (
    updateFilterOperator: (
      filterId: string,
      operator: ListViewFilterOperator,
    ) => void,
  ) => ReactNode;
}

/** Search-mode control for the dashboard list's name search. */
export function useDashboardSearchMode(): DashboardSearchMode {
  return {
    searchOperator: ListViewFilterOperator.TitleOrSlug,
    renderSearchModeControl: () => null,
  };
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
