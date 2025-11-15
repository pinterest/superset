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
 * Chart component using TanStack Query for data fetching
 *
 * This is a modernized version of Chart.jsx that uses:
 * - Functional component instead of class component
 * - useChartData hook instead of Redux actions
 * - Automatic caching and request deduplication
 *
 * Benefits:
 * - Less code (no Redux boilerplate)
 * - Automatic caching (5 min)
 * - Request deduplication
 * - Better error handling
 * - Automatic retries
 */

import React, { useMemo, useRef, useCallback } from 'react';
import {
  ensureIsArray,
  FeatureFlag,
  isFeatureEnabled,
  logging,
  styled,
  t,
  QueryFormData,
  AnnotationData,
  JsonObject,
  DataRecordFilters,
  PlainObject,
} from '@superset-ui/core';
import { PLACEHOLDER_DATASOURCE } from 'src/dashboard/constants';
import Loading from 'src/components/Loading';
import { EmptyStateBig } from 'src/components/EmptyState';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { Logger, LOG_ACTIONS_RENDER_CHART } from 'src/logger/LogUtils';
import { URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import { isCurrentUserBot } from 'src/utils/isBot';
import { ChartSource } from 'src/types/ChartSource';
import { ResourceStatus } from 'src/hooks/apiResources/apiResources';
import { useChartData } from 'src/tanstack-query';
import ChartRenderer from './ChartRenderer';
import { ChartErrorMessage } from './ChartErrorMessage';
import { getChartRequiredFieldsMissingMessage } from '../../utils/getChartRequiredFieldsMissingMessage';

const BLANK = {};
const NONEXISTENT_DATASET = t(
  'The dataset associated with this chart no longer exists',
);

const Styles = styled.div<{ height?: number; width?: number }>`
  min-height: ${p => p.height ?? 0}px;
  position: relative;

  .chart-tooltip {
    opacity: 0.75;
    font-size: ${({ theme }) => theme.typography.sizes.s}px;
  }

  .slice_container {
    display: flex;
    flex-direction: column;
    justify-content: center;

    height: ${p => p.height}px;

    .pivot_table tbody tr {
      font-feature-settings: 'tnum' 1;
    }

    .alert {
      margin: ${({ theme }) => theme.gridUnit * 2}px;
    }
  }
`;

const LoadingDiv = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 80%;
  transform: translate(-50%, -50%);
`;

const MessageSpan = styled.span`
  display: block;
  text-align: center;
  margin: ${({ theme }) => theme.gridUnit * 4}px auto;
  width: fit-content;
  color: ${({ theme }) => theme.colors.grayscale.base};
`;

const MonospaceDiv = styled.div`
  font-family: ${({ theme }) => theme.typography.families.monospace};
  word-break: break-word;
  overflow-x: auto;
  white-space: pre-wrap;
`;

interface ChartWithTanStackQueryProps {
  actions?: JsonObject;
  chartId: number;
  formData: QueryFormData;
  dashboardId?: number;
  timeout?: number;
  force?: boolean;
  ownState?: JsonObject;
  width?: number;
  height?: number;
  vizType: string;
  datasource?: PlainObject;
  datasetsStatus?: 'loading' | 'error' | 'complete';
  annotationData?: AnnotationData;
  setControlValue?: (...args: any[]) => void;
  postTransformProps?: (props: any) => any;
  labelsColor?: JsonObject;
  labelsColorMap?: JsonObject;
  addFilter?: (...args: any[]) => void;
  onFilterMenuOpen?: (...args: any[]) => void;
  onFilterMenuClose?: (...args: any[]) => void;
  onQuery?: () => void;
  initialValues?: DataRecordFilters;
  isInView?: boolean;
  emitCrossFilters?: boolean;
  triggerRender?: boolean;
  isFiltersInitialized?: boolean;
}

function ChartWithTanStackQuery({
  actions,
  chartId,
  formData,
  dashboardId,
  timeout,
  force = false,
  ownState,
  width,
  height,
  vizType,
  datasource,
  datasetsStatus,
  annotationData,
  setControlValue = () => {},
  postTransformProps,
  labelsColor,
  labelsColorMap,
  addFilter = () => BLANK,
  onFilterMenuOpen = () => BLANK,
  onFilterMenuClose = () => BLANK,
  onQuery,
  initialValues = BLANK,
  isInView = true,
  emitCrossFilters,
  triggerRender = false,
  isFiltersInitialized,
}: ChartWithTanStackQueryProps) {
  const renderStartTime = useRef<number>(0);
  const renderContainerStartTime = useRef<number>(0);

  const handleRenderContainerFailure = useCallback(
    (error: Error, info: { componentStack: string }) => {
      logging.warn(error);

      // Call Redux action for backward compatibility
      if (actions?.chartRenderingFailed) {
        actions.chartRenderingFailed(
          error.toString(),
          chartId,
          info ? info.componentStack : null,
        );
      }

      // Log to analytics
      if (actions?.logEvent) {
        actions.logEvent(LOG_ACTIONS_RENDER_CHART, {
          slice_id: chartId,
          has_err: true,
          error_details: error.toString(),
          start_offset: renderStartTime.current,
          ts: new Date().getTime(),
          duration: Logger.getTimestamp() - renderStartTime.current,
        });
      }
    },
    [chartId, actions],
  );

  const {
    data: chartData,
    isLoading,
    error,
    // refetch,
    isFetching,
    isError,
    isStale,
  } = useChartData(
    {
      formData,
      dashboardId,
      force: force || getUrlParam(URL_PARAMS.force) || false,
      ownState,
    },
    {
      // Only fetch when:
      // - Chart is in view (viewport)
      // - Filters are initialized (if applicable)
      enabled:
        isInView &&
        isFiltersInitialized !== false,
    },
  );

  // Extract query response for rendering
  // Note: Error responses use legacy format with errors[], message, link properties
  // Success responses use ChartDataResponseResult format
  const queriesResponse = useMemo(() => {
    if (!chartData) return null;
    return chartData.json.result as PlainObject[];
  }, [chartData]);

  // Map TanStack Query states to Redux chartStatus equivalent
  // chartStatus === 'loading' -> isLoading
  // chartStatus === 'failed' -> isError
  // chartStatus === 'success' -> !isLoading && !isError && !!chartData
  const chartStatus =
    isLoading || isFetching
      ? 'loading'
      : isError
        ? 'failed'
        : 'success';

  // Track render container start time for logging (like Chart.jsx line 296)
  renderContainerStartTime.current = Logger.getTimestamp();

  // Handle failed state with error message
  if (chartStatus === 'failed') {
    return queriesResponse?.map(queryResponse => {
      const message = error?.message || queryResponse?.message;

      if (
        error !== undefined &&
        error?.message !== NONEXISTENT_DATASET &&
        datasource === PLACEHOLDER_DATASOURCE &&
        datasetsStatus !== ResourceStatus.Error
      ) {
        return (
          <Styles
            key={chartId}
            data-ui-anchor="chart"
            className="chart-container"
            data-test="chart-container"
            height={height}
          >
            <Loading />
          </Styles>
        );
      }

      return (
        <ChartErrorMessage
          key={chartId}
          chartId={String(chartId)}
          error={queryResponse?.errors?.[0]}
          {...({
            subtitle: <MonospaceDiv>{message}</MonospaceDiv>,
            copyText: message,
            link: queryResponse?.link || null,
            source: dashboardId ? ChartSource.Dashboard : ChartSource.Explore,
            stackTrace: null,
          } as Record<string, unknown>)}
        />
      );
    });
  }

  // Handle missing required fields (like Chart.jsx line 301-309)
  if (isError && error && ensureIsArray(queriesResponse).length === 0) {
    return (
      <EmptyStateBig
        title={t('Add required control values to preview chart')}
        description={getChartRequiredFieldsMissingMessage(true)}
        image="chart.svg"
      />
    );
  }

  if (
    !isLoading &&
    !isError &&
    !error &&
    isStale &&
    ensureIsArray(queriesResponse).length === 0
  ) {
    return (
      <EmptyStateBig
        title={t('Your chart is ready to go!')}
        description={
          <span>
            {t(
              'Click on "Create chart" button in the control panel on the left to preview a visualization or',
            )}{' '}
            <span role="button" tabIndex={0} onClick={onQuery}>
              {t('click here')}
            </span>
            .
          </span>
        }
        image="chart.svg"
      />
    );
  }

  const renderSpinner = (databaseName?: string) => {
    const message = databaseName
      ? t('Waiting on %s', databaseName)
      : t('Waiting on database...');

    return (
      <LoadingDiv>
        <Loading position="inline-centered" />
        <MessageSpan>{message}</MessageSpan>
      </LoadingDiv>
    );
  };

  const renderChart = () => (
    <ChartRenderer
      actions={actions}
      addFilter={addFilter}
      annotationData={annotationData}
      chartId={chartId}
      data-test={vizType}
      datasource={datasource}
      emitCrossFilters={emitCrossFilters}
      formData={formData}
      height={height}
      initialValues={initialValues}
      labelsColor={labelsColor}
      labelsColorMap={labelsColorMap}
      onFilterMenuClose={onFilterMenuClose}
      onFilterMenuOpen={onFilterMenuOpen}
      ownState={ownState}
      postTransformProps={postTransformProps}
      queriesResponse={queriesResponse}
      setControlValue={setControlValue}
      source={dashboardId ? 'dashboard' : 'explore'}
      triggerRender={triggerRender}
      vizType={vizType}
      width={width}
    />
  );

  const renderChartContainer = () => (
    <div className="slice_container" data-test="slice-container">
      {isInView ||
      !isFeatureEnabled(FeatureFlag.DashboardVirtualization) ||
      isCurrentUserBot()
        ? renderChart()
        : <Loading />}
    </div>
  );

  return (
    <ErrorBoundary
      onError={handleRenderContainerFailure}
      showMessage={false}
    >
      <Styles
        data-ui-anchor="chart"
        className="chart-container"
        data-test="chart-container"
        height={height}
        width={width}
      >
        {chartData && queriesResponse
          ? renderChartContainer()
          : renderSpinner(datasource?.database?.name)}
      </Styles>
    </ErrorBoundary>
  );
}

export default ChartWithTanStackQuery;
