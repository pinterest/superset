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
import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration for TanStack Query
 * 
 * This replaces Redux for async data fetching with:
 * - Automatic caching
 * - Request deduplication
 * - Background refetching
 * - Automatic retries
 * - Better loading/error states
 * - Concurrency control (max 6 concurrent queries)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache chart data for 5 minutes before considering it stale
      // Stale data can still be shown while fresh data is being fetched in background
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      // After this time, cached data will be garbage collected
      cacheTime: 10 * 60 * 1000, // v4: cacheTime, v5: gcTime
      
      // Retry failed requests 2 times before giving up
      retry: 2,
      
      // Exponential backoff for retries: 1s, 2s, 4s (max 30s)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Don't refetch on window focus - too aggressive for dashboards
      // Users explicitly refresh when needed
      refetchOnWindowFocus: false,
      
      // Don't refetch on component mount if data is still fresh
      // This enables instant navigation back to dashboards!
      refetchOnMount: false,
      
      // DO refetch when network reconnects (user was offline)
      refetchOnReconnect: true,
      
      // Enable network-mode optimizations
      // 'online' = only fetch when online (better for mobile)
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once (POST/PUT/DELETE operations)
      retry: 1,
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Concurrency limiter: limits concurrent queries to prevent overwhelming server
// This is especially important for dashboards with many charts
let activeQueries = 0;
const MAX_CONCURRENT_QUERIES = 6; // Adjust based on your server capacity
const queryQueue: Array<() => void> = [];

export const acquireQuerySlot = () => {
  return new Promise<void>((resolve) => {
    if (activeQueries < MAX_CONCURRENT_QUERIES) {
      activeQueries++;
      resolve();
    } else {
      queryQueue.push(() => {
        activeQueries++;
        resolve();
      });
    }
  });
};

export const releaseQuerySlot = () => {
  activeQueries--;
  const next = queryQueue.shift();
  if (next) {
    next();
  }
};

