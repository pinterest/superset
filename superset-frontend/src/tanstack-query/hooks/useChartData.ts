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
import { useRef } from 'react';
import { getChartDataRequest } from 'src/components/Chart/chartAction';
import {
  type ChartDataResponseResult,
  SupersetClient,
  ensureIsArray,
} from '@superset-ui/core';
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

interface AsyncEvent {
  id?: string | null;
  channel_id: string;
  job_id: string;
  user_id?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  errors?: any[];
  result_url: string | null;
}

interface ChartDataResponse {
  json: {
    result: ChartDataResponseResult[];
  };
  response: Response;
  // Fields for async query tracking
  asyncJobId?: string;
  asyncStatus?: 'pending' | 'running' | 'done' | 'error';
}

const POLLING_INTERVAL = 500;

/**
 * Custom hook to fetch chart data using TanStack Query
 *
 * This replaces Redux-based chart data fetching with automatic:
 * - Caching (charts with same formData reuse cached data)
 * - Request deduplication (multiple charts with same config fetch once)
 * - Retries on failure
 * - Background refetching
 * - Loading and error states
 * - Concurrency control (max 6 concurrent requests)
 *
 * Benefits over Redux approach:
 * 1. Automatic caching - navigate back to dashboard and charts load instantly!
 * 2. Request deduplication - 10 charts with same config = 1 API call
 * 3. Concurrency limiting - prevents overwhelming server with 50+ simultaneous requests
 * 4. Better UX - loading states, error boundaries, retry logic
 * 5. Less boilerplate - no actions, reducers, selectors needed
 * 6. DevTools - see all queries, cache state, network requests in real-time
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
  // Track async job state across refetches
  const asyncJobRef = useRef<{
    jobId: string | null;
  }>({
    jobId: null,
  });

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

      // If we have a job ID, we're polling for async results
      if (asyncJobRef.current.jobId) {
        try {
          // Fetch async event status
          const { json } = await SupersetClient.get({
            endpoint: '/api/v1/async_event/',
          });

          const events = (json.result || []) as AsyncEvent[];
          const event = events.find(
            e => e.job_id === asyncJobRef.current.jobId,
          );

          if (!event) {
            return {
              response: new Response(),
              json: { result: [] },
              asyncJobId: asyncJobRef.current.jobId,
              asyncStatus: 'pending' as const,
            };
          }

          if (event.status === 'done') {
            // Fetch the cached result
            if (!event.result_url) {
              throw new Error(
                'Async query completed but no result_url provided',
              );
            }

            const { json: resultJson } = await SupersetClient.get({
              endpoint: event.result_url,
            });

            // Clear job ID so we don't keep polling
            asyncJobRef.current.jobId = null;

            const data = ensureIsArray(resultJson);

            return {
              response: new Response(),
              json: { result: data },
              asyncStatus: 'done' as const,
            };
          }

          if (event.status === 'error') {
            // Clear job ID and throw error
            asyncJobRef.current.jobId = null;
            const errorMessage =
              event.errors?.[0]?.message || 'Async query failed';
            throw new Error(errorMessage);
          }

          // Still pending or running, keep polling
          return {
            response: new Response(),
            json: { result: [] },
            asyncJobId: asyncJobRef.current.jobId,
            asyncStatus: event.status,
          };
        } catch (error) {
          console.error(
            `[Chart ${chartIdForLog}] Error polling async job:`,
            error,
          );
          throw error;
        }
      }

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

        // Check if this is an async query (202 response)
        if (chartDataResponse.response.status === 202) {
          const asyncResponse = chartDataResponse.json as { job_id?: string };

          if (asyncResponse?.job_id) {
            // Store job ID for polling
            asyncJobRef.current.jobId = asyncResponse.job_id;

            return {
              response: chartDataResponse.response,
              json: { result: [] },
              asyncJobId: asyncResponse.job_id,
              asyncStatus: 'pending' as const,
            };
          }
        }

        // Synchronous response (200)
        const result = chartDataResponse.json.result || chartDataResponse.json;
        const queriesResponse = ensureIsArray(result);

        return {
          response: chartDataResponse.response,
          json: { result: queriesResponse },
          asyncStatus: 'done' as const,
        };
      } catch (error) {
        asyncJobRef.current.jobId = null;
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

    // Use native polling for async queries
    // Only poll if we have an async job in progress
    refetchInterval: (data: ChartDataResponse | undefined) => {
      const isPolling =
        data?.asyncStatus &&
        data.asyncStatus !== 'done' &&
        data.asyncStatus !== 'error';

      if (isPolling) {
        return POLLING_INTERVAL;
      }

      return false;
    },

    // Prevent query from being disabled while polling
    refetchIntervalInBackground: false,

    // Allow component to override any options
    ...options,
  });

  return query;
}
