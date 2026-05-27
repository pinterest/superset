/** Stub for chart list extensions. Internal build replaces this with the real implementation. */

/** Extra column names to request from the chart list API. */
export function getChartListExtraColumnsToFetch(): string[] {
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
