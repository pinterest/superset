/** Stub for chart list extensions. Internal build replaces this with the real implementation. */
import type { Filter } from 'src/components/ListView/types';

/** Extra search filters to add to the chart list. */
export function getChartListSearchFilters(): Filter[] {
  return [];
}

/** Extra indicators rendered before the chart title. */
export function getChartListTitleIndicators(_chart: any) {
  return null;
}

/** Extra table column configs for the chart list. */
export function getChartListExtraListColumns(): object[] {
  return [];
}
