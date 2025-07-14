import AdhocMetric, { EXPRESSION_TYPES } from '../MetricControl/AdhocMetric';
import { JsonObject, SupersetClient, t } from '@superset-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

import { ControlComponentProps } from 'src/explore/components/Control';
import { Dataset } from '@superset-ui/chart-controls';
import { ExplorePageState } from 'src/explore/types';
import SelectControl from '../SelectControl';
import { changeDatasource } from 'src/explore/actions/datasourcesActions';

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
            label: metric,
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
          sqlExpression: `SUM(CASE WHEN ${metricNameColumn} = '${selectedValue}' THEN ${metricValueColumn} ELSE NULL END)`,
          label: selectedValue,
          hasCustomLabel: true,
        });
      }
      props!.onChange!([newMetric]);
      return;
    }

    let newMetric: AdhocMetric;
    let targetDataset;

    if (wideDatasetMetrics.includes(selectedValue)) {
      // Change dataset to wide dataset
      targetDataset = wideDataset;
      newMetric = new AdhocMetric({
        expressionType: EXPRESSION_TYPES.SQL,
        sqlExpression: `SUM(${selectedValue})`,
        label: selectedValue,
        hasCustomLabel: true,
      });
    } else {
      // Change dataset to long dataset
      targetDataset = longDataset;
      newMetric = new AdhocMetric({
        expressionType: EXPRESSION_TYPES.SQL,
        sqlExpression: `SUM(CASE WHEN ${metricNameColumn} = '${selectedValue}' THEN ${metricValueColumn} ELSE NULL END)`,
        label: selectedValue,
        hasCustomLabel: true,
      });
    }

    // Update the datasource in redux state
    if (currentDatasource?.id !== targetDataset.id) {
      dispatch(changeDatasource(targetDataset));
    }

    props!.onChange!([newMetric]);
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
