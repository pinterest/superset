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
import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider wraps the app with TanStack Query context
 * 
 * This enables:
 * - useQuery hooks throughout the app
 * - Global query cache
 * - DevTools for debugging (development only)
 * 
 * Usage in preamble.tsx:
 * 
 * root.render(
 *   <QueryProvider>
 *     <Provider store={store}>
 *       <App />
 *     </Provider>
 *   </QueryProvider>
 * );
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 
        React Query Devtools - shows all queries, their state, and cache
        Only included in development builds
        Access via floating icon in bottom-right corner
        
        Features:
        - View all active/inactive queries
        - See query state (loading, success, error)
        - Inspect cached data
        - Manually invalidate/refetch queries
        - Monitor network requests
      */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

