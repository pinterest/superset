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
 * TanStack Query integration for Superset Charts
 *
 * This module provides hooks and utilities for fetching chart data
 * using TanStack Query (React Query).
 *
 * Usage:
 * import { useChartData, chartQueryKeys } from 'src/tanstack-query';
 * import { queryClient } from 'src/views/QueryClientProvider';
 *
 * Note: QueryClient is already set up in src/views/QueryClientProvider
 * and wrapped around the app in RootContextProviders.
 */

export { useChartData } from './hooks/useChartData';
export {
  chartQueryKeys,
  dashboardQueryKeys,
  datasourceQueryKeys,
} from './queryKeys';

// Re-export queryClient from existing setup
export { queryClient } from '../views/QueryClientProvider';
