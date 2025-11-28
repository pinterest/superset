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
import { useMemo, useRef, useCallback, memo } from 'react';
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
  PlainObject,
  SqlaFormData,
} from '@superset-ui/core';
import type { Datasource } from 'src/explore/types';
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
import { Dispatch } from 'redux';
import ChartRenderer from './ChartRenderer';
import { ChartErrorMessage } from './ChartErrorMessage';
import { getChartRequiredFieldsMissingMessage } from '../../utils/getChartRequiredFieldsMissingMessage';

type Actions = {
  logEvent(
    LOG_ACTIONS_RENDER_CHART: string,
    arg1: {
      slice_id: number;
      has_err: boolean;
      error_details: string;
      start_offset: number;
      ts: number;
      duration: number;
    },
  ): Dispatch;
  chartRenderingFailed(
    arg0: string,
    chartId: number,
    arg2: string | null,
  ): Dispatch;
  postChartFormData(
    formData: SqlaFormData,
    arg1: boolean,
    timeout: number | undefined,
    chartId: number,
    dashboardId: number | undefined,
    ownState: JsonObject | undefined,
  ): Dispatch;
};

interface ChartWithTanStackQueryProps {
  annotationData?: AnnotationData;
  actions: Actions;
  chartId: number;
  datasource?: Datasource;
  dashboardId?: number;
  initialValues?: object;
  formData: QueryFormData;
  labelsColor?: string;
  labelsColorMap?: string;
  sharedLabelColors?: string;
  width: number;
  height: number;
  setControlValue: Function;
  timeout?: number;
  vizType: string;
  triggerRender?: boolean;
  force?: boolean;
  isFiltersInitialized?: boolean;
  addFilter?: (type: string) => void;
  onQuery?: () => void;
  onFilterMenuOpen?: (chartId: number, column: string) => void;
  onFilterMenuClose?: (chartId: number, column: string) => void;
  ownState?: JsonObject;
  postTransformProps?: Function;
  datasetsStatus?: 'loading' | 'error' | 'complete';
  isInView?: boolean;
  emitCrossFilters?: boolean;
}

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

function ChartWithTanStackQuery({
  actions,
  chartId,
  formData,
  dashboardId,
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
  sharedLabelColors,
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

  // Memoize formData to prevent re-renders when parent recreates the object
  // The object references change on every Redux update, even though content is the same.
  // This defensive memoization prevents unnecessary re-renders at the component level.
  const memoizedFormData = useMemo(
    () => formData,
    [
      // Only re-memoize if actual content changes
      chartId,
      formData?.slice_id,
      formData?.datasource,
      formData?.viz_type,
      JSON.stringify(formData?.filters || []),
      JSON.stringify(formData?.adhoc_filters || []),
      JSON.stringify(formData?.extra_filters || []),
      formData?.time_range,
      JSON.stringify(formData?.groupby || []),
      JSON.stringify(formData?.metrics || []),
      formData?.limit,
      formData?.row_limit,
      // Add other critical formData fields that affect queries
    ],
  );

  const handleRenderContainerFailure = useCallback(
    (error: Error, info: { componentStack: string }) => {
      logging.warn(error);

      // Call Redux action for backward compatibility
      actions.chartRenderingFailed(
        error.toString(),
        chartId,
        info ? info.componentStack : null,
      );

      // Log to analytics
      actions.logEvent(LOG_ACTIONS_RENDER_CHART, {
        slice_id: chartId,
        has_err: true,
        error_details: error.toString(),
        start_offset: renderStartTime.current,
        ts: new Date().getTime(),
        duration: Logger.getTimestamp() - renderStartTime.current,
      });
    },
    [chartId, actions],
  );

  const {
    data: chartData,
    isLoading,
    error,
    isFetching,
    isError,
    fetchStatus,
  } = useChartData(
    {
      formData: memoizedFormData,
      dashboardId,
      force: force || getUrlParam(URL_PARAMS.force) || false,
      ownState,
    },
    {
      // Only fetch when:
      // - Chart is in view (viewport)
      // - Filters are initialized (if applicable)
      enabled: isInView && isFiltersInitialized !== false,
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
    isLoading || isFetching ? 'loading' : isError ? 'failed' : 'success';

  // Track render container start time for logging
  renderContainerStartTime.current = Logger.getTimestamp();

  // Handle failed state with error message
  if (chartStatus === 'failed') {
    const errorElements = queriesResponse?.map((queryResponse: PlainObject) => {
      const message =
        (error as Error | undefined)?.message || queryResponse?.message;

      if (
        error !== undefined &&
        (error as Error)?.message !== NONEXISTENT_DATASET &&
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
            link: queryResponse?.link ?? null,
            source: dashboardId ? ChartSource.Dashboard : ChartSource.Explore,
            stackTrace: null,
          } as Record<string, unknown>)}
        />
      );
    });

    return <>{errorElements}</>;
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
    !isFetching &&
    !isError &&
    !error &&
    fetchStatus === 'idle' &&
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
      formData={memoizedFormData}
      height={height}
      initialValues={initialValues}
      labelsColor={labelsColor}
      labelsColorMap={labelsColorMap}
      sharedLabelColors={sharedLabelColors}
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
      isCurrentUserBot() ? (
        renderChart()
      ) : (
        <Loading />
      )}
    </div>
  );

  return (
    <ErrorBoundary onError={handleRenderContainerFailure} showMessage={false}>
      <Styles
        data-ui-anchor="chart"
        className="chart-container"
        data-test="chart-container"
        height={height}
        width={width}
      >
        {chartData &&
        queriesResponse &&
        ensureIsArray(queriesResponse).length > 0
          ? renderChartContainer()
          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-member-access
            renderSpinner((datasource?.database as any)?.name)}
      </Styles>
    </ErrorBoundary>
  );
}

// Custom comparison function for React.memo
// Since parent creates new formData object references even when content is same,
// we need to compare the actual content, not just references
function arePropsEqual(
  prevProps: ChartWithTanStackQueryProps,
  nextProps: ChartWithTanStackQueryProps,
): boolean {
  // Quick checks for primitives and stable references
  if (
    prevProps.chartId !== nextProps.chartId ||
    prevProps.dashboardId !== nextProps.dashboardId ||
    prevProps.force !== nextProps.force ||
    prevProps.width !== nextProps.width ||
    prevProps.height !== nextProps.height ||
    prevProps.vizType !== nextProps.vizType ||
    prevProps.isInView !== nextProps.isInView ||
    prevProps.triggerRender !== nextProps.triggerRender ||
    prevProps.isFiltersInitialized !== nextProps.isFiltersInitialized
  ) {
    return false; // Props changed, need to re-render
  }

  // Deep comparison for formData (the expensive one that changes reference frequently)
  const prevFormData = prevProps.formData;
  const nextFormData = nextProps.formData;

  // Check key formData fields that affect the query
  if (
    prevFormData?.slice_id !== nextFormData?.slice_id ||
    prevFormData?.datasource !== nextFormData?.datasource ||
    prevFormData?.viz_type !== nextFormData?.viz_type ||
    prevFormData?.time_range !== nextFormData?.time_range ||
    prevFormData?.limit !== nextFormData?.limit ||
    prevFormData?.row_limit !== nextFormData?.row_limit ||
    JSON.stringify(prevFormData?.filters) !==
      JSON.stringify(nextFormData?.filters) ||
    JSON.stringify(prevFormData?.adhoc_filters) !==
      JSON.stringify(nextFormData?.adhoc_filters) ||
    JSON.stringify(prevFormData?.extra_filters) !==
      JSON.stringify(nextFormData?.extra_filters) ||
    JSON.stringify(prevFormData?.groupby) !==
      JSON.stringify(nextFormData?.groupby) ||
    JSON.stringify(prevFormData?.metrics) !==
      JSON.stringify(nextFormData?.metrics)
  ) {
    return false; // formData content changed
  }

  // For other object props, do shallow comparison
  // (These might also be changing reference, but less frequently)
  if (
    prevProps.datasource !== nextProps.datasource ||
    prevProps.annotationData !== nextProps.annotationData ||
    prevProps.labelsColor !== nextProps.labelsColor ||
    prevProps.labelsColorMap !== nextProps.labelsColorMap
  ) {
    return false;
  }

  // All checks passed - props are effectively equal
  return true;
}

// Wrap in React.memo to prevent render calls when props haven't changed
export default memo(ChartWithTanStackQuery, arePropsEqual);
