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

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,

      // Exponential backoff for retries
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus
      refetchOnWindowFocus: false,

      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // DO refetch when reconnecting
      refetchOnReconnect: true,
    },
  },
});

interface QueryClientProviderWrapperProps {
  children: React.ReactNode;
}

export const QueryClientProviderWrapper: React.FC<QueryClientProviderWrapperProps> = ({
  children,
}) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {/* React Query DevTools - only in development */}
    {process.env.NODE_ENV === 'development' && (
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    )}
  </QueryClientProvider>
);

export { queryClient };
