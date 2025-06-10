import { useSelector } from 'react-redux';
import { JsonObject, SupersetClient, t } from '@superset-ui/core';
import { useEffect, useState } from 'react';

import { ControlComponentProps } from 'src/explore/components/Control';
import { ExplorePageState } from 'src/explore/types';

import AdhocMetric, { EXPRESSION_TYPES } from '../MetricControl/AdhocMetric';
import SelectControl from '../SelectControl';

export default function DEXMetricControl(props: ControlComponentProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const datasetId = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_DATASET_ID,
  );
  const metricNameColumn = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_METRIC_NAME_COLUMN,
  );
  const metricValueColumn = useSelector<ExplorePageState>(
    state => state.common.conf.PINTEREST_DEX_METRIC_VALUE_COLUMN,
  );

  useEffect(() => {
    setIsLoading(true);
    SupersetClient.get({
      endpoint: `/api/v1/datasource/table/${datasetId}/column/${metricNameColumn}/values/`,
    })
      .then(({ json }) => {
        const metricOptions = (json.result || []).map((value: any) => ({
          label: String(value),
          value: String(value),
        }));
        setOptions(metricOptions);
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

    // Create a new AdhocMetric with SQL expression
    const newMetric = new AdhocMetric({
      expressionType: EXPRESSION_TYPES.SQL,
      sqlExpression: `SUM(CASE WHEN ${metricNameColumn} = '${selectedValue}' THEN ${metricValueColumn} ELSE NULL END)`,
      label: selectedValue,
      hasCustomLabel: true,
    });
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
