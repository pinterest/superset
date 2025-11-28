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
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  getChartDataRequest,
  handleChartDataResponse,
} from 'src/components/Chart/chartAction';
import {
  type ChartDataResponseResult,
  ensureIsArray,
} from '@superset-ui/core';
import { getQuerySettings } from 'src/explore/exploreUtils';
import { chartQueryKeys } from '../queryKeys';

interface UseChartDataParams {
  formData: any;
  force?: boolean;
  ownState?: any;
  dashboardId?: number;
  resultFormat?: 'json' | 'csv';
  resultType?: 'full' | 'query' | 'results' | 'samples';
  setDataMask?: () => void;
}

interface ChartDataResponse {
  json: {
    result: ChartDataResponseResult[];
  };
  response: Response;
}

/**
 * Custom hook to fetch chart data using TanStack Query
 *
 * This replaces Redux-based chart data fetching with automatic:
 * - Caching (charts with same formData reuse cached data)
 * - Request deduplication (multiple charts with same config fetch once)
 * - Retries on failure
 * - Background refetching
 * - Loading and error states
 *
 * @example Basic usage
 * const { data, isLoading, error } = useChartData({
 *   formData: chartFormData,
 *   dashboardId: 123,
 * });
 *
 * @example With force refresh
 * const { data, refetch } = useChartData({
 *   formData: chartFormData,
 *   force: true, // Skip cache, fetch fresh data
 * });
 *
 * @example With loading state
 * const { data, isLoading, isFetching } = useChartData({
 *   formData: chartFormData,
 * });
 * if (isLoading) return <Spinner />;
 * if (data) return <ChartRenderer data={data} />;
 */
export function useChartData(
  {
    formData,
    force = false,
    ownState = {},
    dashboardId,
    resultFormat = 'json',
    resultType = 'full',
    setDataMask = () => {},
  }: UseChartDataParams,
  options?: Omit<
    UseQueryOptions<ChartDataResponse, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  const query = useQuery({
    // Query key: uniquely identifies this query for caching and deduplication
    // TanStack Query will:
    // - Cache responses by this key
    // - Dedupe simultaneous requests with same key
    // - Return cached data instantly on subsequent calls
    queryKey: [
      ...chartQueryKeys.byDashboard(dashboardId || 0),
      {
        // Core chart identification
        slice_id: formData?.slice_id,
        datasource: formData?.datasource,
        viz_type: formData?.viz_type,

        // Filters that affect data
        filters: formData?.filters,
        adhoc_filters: formData?.adhoc_filters,
        extra_filters: formData?.extra_filters,

        // Time range
        time_range: formData?.time_range,
        time_grain_sqla: formData?.time_grain_sqla,
        granularity_sqla: formData?.granularity_sqla,

        // Grouping and columns
        groupby: formData?.groupby,
        columns: formData?.columns,
        all_columns: formData?.all_columns,

        // Metrics
        metrics: formData?.metrics,

        // Sorting and limits
        timeseries_limit_metric: formData?.timeseries_limit_metric,
        limit: formData?.limit,
        row_limit: formData?.row_limit,

        // Other query params
        order_desc: formData?.order_desc,
        truncate_metric: formData?.truncate_metric,

        // Include result format/type in key
        resultFormat,
        resultType,

        // Include force flag so forced refreshes don't use stale cache
        force,
      },
    ],

    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      const chartIdForLog = formData?.slice_id || 'unknown';

      try {
        const requestParams: Record<string, unknown> = {
          signal,
        };

        if (dashboardId) {
          requestParams.dashboard_id = dashboardId;
        }

        // Make the initial API request
        const chartDataResponse = await getChartDataRequest({
          formData,
          resultFormat,
          resultType,
          force,
          method: 'POST',
          requestParams,
          ownState,
          setDataMask,
        });

        // Use the existing global polling system for async queries
        // This handles 202 responses by registering with the shared polling loop
        // instead of creating per-chart polling requests
        const [useLegacyApi] = getQuerySettings(formData);
        const queriesResponse = await handleChartDataResponse(
          chartDataResponse.response,
          chartDataResponse.json,
          useLegacyApi,
        );

        return {
          response: chartDataResponse.response,
          json: { result: ensureIsArray(queriesResponse) },
        };
      } catch (error) {
        console.error(`[Chart ${chartIdForLog}] Query failed:`, error);
        throw error;
      }
    },

    // Only enable query if we have required data
    // Prevents unnecessary API calls for charts that aren't ready
    enabled: (() => {
      const hasFormData = !!formData;
      const hasDatasource = !!formData?.datasource;
      const optionsEnabled = options?.enabled !== false;
      const isEnabled = hasFormData && hasDatasource && optionsEnabled;

      return isEnabled;
    })(),

    // Stale time configuration
    // - If force=true, data is immediately stale (refetch right away)
    // - Otherwise use default from queryClient (5 minutes)
    staleTime: force ? 0 : undefined,

    // Refetch on mount configuration
    // - If force=true, always refetch (ignore cache)
    // - Otherwise respect default (false = use cache if fresh)
    refetchOnMount: force ? 'always' : false,

    // Allow component to override any options
    ...options,
  });

  return query;
}
