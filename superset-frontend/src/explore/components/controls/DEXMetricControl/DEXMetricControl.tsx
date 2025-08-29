import {
  AdhocFilter as AdhocFilterType,
  DatasourceType,
  JsonObject,
  NO_TIME_RANGE,
  SupersetClient,
  t,
} from '@superset-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

import { ControlComponentProps } from 'src/explore/components/Control';
import { Dataset } from '@superset-ui/chart-controls';
import { ExplorePageState } from 'src/explore/types';
import { changeDatasource } from 'src/explore/actions/datasourcesActions';
import { setControlValue } from 'src/explore/actions/exploreActions';

import AdhocFilter from '../FilterControl/AdhocFilter';
import AdhocMetric, { EXPRESSION_TYPES } from '../MetricControl/AdhocMetric';
import SelectControl from '../SelectControl';

// Helper function to get temporal columns from datasource
const getTemporalColumns = (datasource: Dataset) => {
  if (!datasource?.columns)
    return { temporalColumns: [], defaultTemporalColumn: null };

  const temporalColumns = datasource.columns
    .filter(col => col.is_dttm)
    .map(col => col.column_name);

  return {
    temporalColumns,
    defaultTemporalColumn: temporalColumns[0] || null,
  };
};

// Helper function to create time range filter based on mixins logic
const createTimeRangeFilter = (
  currentFilters: AdhocFilterType[],
  datasource: Dataset,
  state: any,
): AdhocFilterType[] => {
  // Check if there's already a time filter in adhoc filters
  const hasTimeFilter =
    currentFilters.findIndex((flt: any) => flt?.operator === 'TEMPORAL_RANGE') >
    -1;

  if (hasTimeFilter) {
    return currentFilters;
  }

  // Check if time_range control is present (legacy charts)
  if (state?.controls?.time_range?.value) {
    return currentFilters;
  }

  // Should migrate original granularity_sqla and time_range into adhoc filter
  if (state?.form_data?.granularity_sqla && state?.form_data?.time_range) {
    return [
      ...currentFilters,
      {
        clause: 'WHERE',
        subject: state.form_data.granularity_sqla,
        operator: 'TEMPORAL_RANGE',
        comparator: state.form_data.time_range,
        expressionType: 'SIMPLE',
      } as AdhocFilterType,
    ];
  }

  // Should apply the default time filter into adhoc filter
  const temporalColumn =
    datasource && getTemporalColumns(datasource).defaultTemporalColumn;
  if (temporalColumn) {
    return [
      ...currentFilters,
      {
        clause: 'WHERE',
        subject: temporalColumn,
        operator: 'TEMPORAL_RANGE',
        comparator: state?.common?.conf?.DEFAULT_TIME_FILTER || NO_TIME_RANGE,
        expressionType: 'SIMPLE',
      } as AdhocFilterType,
    ];
  }

  return currentFilters;
};

export default function DEXMetricControl(props: ControlComponentProps) {
  const dispatch = useDispatch();
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const longDatasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_LONG_DATASET_ID,
  );
  const wideDatasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_WIDE_DATASET_ID,
  );
  const wideDatasetMetrics = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_WIDE_DATASET_METRICS,
  ) as string[];
  const metricNameColumn = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_METRIC_NAME_COLUMN,
  );
  const metricValueColumn = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_METRIC_VALUE_COLUMN,
  );

  // Get datasets from redux state
  const datasources = useSelector<ExplorePageState>(
    state => state.datasources,
  ) as { [key: string]: Dataset };
  const currentDatasource = useSelector<ExplorePageState>(
    state => state.explore.datasource,
  ) as Dataset;

  // Get current state for time range logic
  const currentState = useSelector<ExplorePageState>(state => state);

  const longDataset = datasources[`${longDatasetId}__table`];
  const wideDataset = datasources[`${wideDatasetId}__table`];

  useEffect(() => {
    setIsLoading(true);
    SupersetClient.get({
      endpoint: `/api/v1/datasource/table/${longDatasetId}/column/${metricNameColumn}/values/`,
    })
      .then(({ json }) => {
        const metricOptions = (json.result || []).map((value: any) => ({
          label: String(value),
          value: String(value),
        }));
        setOptions([
          ...wideDatasetMetrics.map(metric => ({
            label: metric.replace(/"/g, ''),
            value: metric,
          })),
          ...metricOptions,
        ]);
      })
      .catch(error => {
        console.error('Error fetching metric values:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleChange = (selectedValue: string) => {
    if (!selectedValue) {
      props!.onChange!(null);
      return;
    }

    // Check if both datasets are loaded
    if (!longDataset || !wideDataset) {
      console.warn('Datasets not loaded yet, cannot switch datasource');
      // Still create the metric but don't switch datasource
      let newMetric: AdhocMetric;
      let newFilter: AdhocFilterType | null = null;
      if (wideDatasetMetrics.includes(selectedValue)) {
        newMetric = new AdhocMetric({
          expressionType: EXPRESSION_TYPES.SQL,
          sqlExpression: `SUM(${selectedValue})`,
          label: selectedValue,
          hasCustomLabel: true,
        });
      } else {
        newMetric = new AdhocMetric({
          expressionType: EXPRESSION_TYPES.SQL,
          sqlExpression: `SUM(${metricValueColumn})`,
          label: selectedValue,
          hasCustomLabel: true,
        });
        newFilter = new AdhocFilter({
          clause: 'WHERE',
          expressionType: 'SIMPLE',
          subject: metricNameColumn,
          operator: '==',
          comparator: selectedValue,
        });
      }
      props!.onChange!([newMetric]);

      // Apply time range logic from mixins instead of overriding with empty array
      let filters: AdhocFilterType[] = [];
      if (newFilter !== null) {
        filters.push(newFilter);
      }

      // Apply time range logic to preserve existing time filters and add default ones
      filters = createTimeRangeFilter(filters, currentDatasource, currentState);
      dispatch(setControlValue('adhoc_filters', filters));
      return;
    }

    let newMetric: AdhocMetric;
    let newFilter: AdhocFilterType | null = null;
    let targetDataset;

    if (wideDatasetMetrics.includes(selectedValue)) {
      // Change dataset to wide dataset
      targetDataset = {
        ...wideDataset,
        type: DatasourceType.Query,
      };
      newMetric = new AdhocMetric({
        expressionType: EXPRESSION_TYPES.SQL,
        sqlExpression: `SUM(${selectedValue})`,
        label: selectedValue,
        hasCustomLabel: true,
      });
    } else {
      // Change dataset to long dataset
      targetDataset = {
        ...longDataset,
        type: DatasourceType.Table,
      };
      newMetric = new AdhocMetric({
        expressionType: EXPRESSION_TYPES.SQL,
        sqlExpression: `SUM(${metricValueColumn})`,
        label: selectedValue,
        hasCustomLabel: true,
      });
      newFilter = new AdhocFilter({
        clause: 'WHERE',
        expressionType: 'SIMPLE',
        subject: metricNameColumn,
        operator: '==',
        comparator: selectedValue,
      });
    }

    // Update the datasource in redux state
    if (currentDatasource?.id !== targetDataset.id) {
      dispatch(changeDatasource(targetDataset));
    }

    props!.onChange!([newMetric]);

    // Apply time range logic from mixins instead of overriding with empty array
    let filters: AdhocFilterType[] = [];
    if (newFilter !== null) {
      filters.push(newFilter);
    }

    // Apply time range logic to preserve existing time filters and add default ones
    filters = createTimeRangeFilter(filters, targetDataset, currentState);
    dispatch(setControlValue('adhoc_filters', filters));
  };

  return (
    <SelectControl
      {...props}
      value={(props.value as JsonObject)?.label}
      options={options}
      isLoading={isLoading}
      onChange={handleChange}
      placeholder={t('Select metric')}
    />
  );
}
