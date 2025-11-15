/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Centralized query key factory for TanStack Query
 *
 * Benefits:
 * - Type-safe query keys across the app
 * - Easy to invalidate related queries
 * - Consistent key structure
 * - Self-documenting query organization
 *
 * Query Key Structure:
 * - ['chartData'] = all chart queries
 * - ['chartData', 'dashboard', 123] = all charts in dashboard 123
 * - ['chartData', { formData }] = specific chart config
 */
export const chartQueryKeys = {
  /**
   * Base key for all chart data queries
   * Use this to invalidate ALL chart queries:
   * queryClient.invalidateQueries({ queryKey: chartQueryKeys.all })
   */
  all: ['chartData'] as const,

  /**
   * Key for chart lists
   */
  lists: () => [...chartQueryKeys.all, 'list'] as const,

  /**
   * Key for filtered chart list
   * @param {Record<string, any>} filters Filter criteria
   */
  list: (filters: Record<string, any>) =>
    [...chartQueryKeys.lists(), filters] as const,

  /**
   * Base key for individual chart details
   */
  details: () => [...chartQueryKeys.all, 'detail'] as const,

  /**
   * Key for specific chart by ID
   * @param {number|string} id Chart/slice ID
   */
  detail: (id: number | string) =>
    [...chartQueryKeys.details(), id] as const,

  /**
   * Key for all charts in a specific dashboard
   * Useful for invalidating all dashboard charts at once
   * @param {number} dashboardId Dashboard ID
   *
   * Example:
   * // Refresh all charts in dashboard 123
   * queryClient.invalidateQueries({
   *   queryKey: chartQueryKeys.byDashboard(123),
   * })
   */
  byDashboard: (dashboardId: number) =>
    [...chartQueryKeys.all, 'dashboard', dashboardId] as const,

  /**
   * Key for chart query by formData configuration
   * This enables automatic deduplication - if multiple charts have
   * the same formData, they'll share the same cache entry!
   *
   * @param {any} formData Chart configuration object
   *
   * Example:
   * // Two charts with identical formData will fetch once and share cache
   * const chart1 = useChartData({ formData: config });
   * const chart2 = useChartData({ formData: config }); // Uses chart1's cache!
   */
  byFormData: (formData: any) =>
    [...chartQueryKeys.all, formData] as const,
};

/**
 * Query keys for dashboard-level data
 */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,

  lists: () => [...dashboardQueryKeys.all, 'list'] as const,

  list: (filters: Record<string, any>) =>
    [...dashboardQueryKeys.lists(), filters] as const,

  details: () => [...dashboardQueryKeys.all, 'detail'] as const,

  detail: (id: number | string) =>
    [...dashboardQueryKeys.details(), id] as const,
};

/**
 * Query keys for dataset/datasource data
 */
export const datasourceQueryKeys = {
  all: ['datasource'] as const,

  detail: (datasourceId: string) =>
    [...datasourceQueryKeys.all, datasourceId] as const,

  samples: (datasourceId: string) =>
    [...datasourceQueryKeys.all, datasourceId, 'samples'] as const,
};

/**
 * Example Usage:
 *
 * // In a component:
 * const { data } = useQuery({
 *   queryKey: chartQueryKeys.byFormData(formData),
 *   queryFn: () => fetchChartData(formData),
 * });
 *
 * // Invalidate specific dashboard's charts:
 * queryClient.invalidateQueries({
 *   queryKey: chartQueryKeys.byDashboard(123),
 * });
 *
 * // Invalidate all chart queries:
 * queryClient.invalidateQueries({
 *   queryKey: chartQueryKeys.all,
 * });
 *
 * // Prefetch a chart (before user navigates):
 * queryClient.prefetchQuery({
 *   queryKey: chartQueryKeys.byFormData(formData),
 *   queryFn: () => fetchChartData(formData),
 * });
 */
