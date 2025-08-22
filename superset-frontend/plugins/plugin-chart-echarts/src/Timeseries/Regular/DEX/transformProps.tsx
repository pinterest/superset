import { AdhocMetricSimple } from '@superset-ui/core';
import { DEXChartTransformedProps } from './types';
import { EchartsTimeseriesChartProps } from '../../types';
import echartsTranformProps from '../../transformProps';

// Function to transform pivoted data from wide to long format
function transformPivotDataToLongFormat(
  pivotData: any,
  groupby: string[],
  metric: string,
): any {
  if (
    !pivotData?.data ||
    !Array.isArray(pivotData.data) ||
    !groupby.length ||
    !metric
  ) {
    return pivotData;
  }

  const transformedData: any[] = [];

  pivotData.data.forEach((row: any) => {
    const { dt, ...otherColumns } = row;

    // Get the groupby column names
    Object.keys(otherColumns).forEach(metricCol => {
      const metricColGroupByVals = metricCol.split(', ');
      const currentEntry: any = {
        dt,
        [metric]: row[metricCol],
      };
      metricColGroupByVals.forEach((groupByValue, i) => {
        currentEntry[groupby[i]] = groupByValue;
      });
      transformedData.push(currentEntry);
    });
  });

  return {
    ...pivotData,
    data: transformedData,
  };
}

export default function transformProps(
  chartProps: EchartsTimeseriesChartProps,
): DEXChartTransformedProps {
  const defaultProps = echartsTranformProps(chartProps);
  const { queriesData = [], formData } = chartProps;

  // Get the groupby columns from formData
  const groupby = formData.groupby || [];
  const metric = (formData.metrics[0] as AdhocMetricSimple).label!;

  // Transform the pivot data to long format
  const transformedPivotData = transformPivotDataToLongFormat(
    queriesData[0],
    groupby as string[],
    metric,
  );

  return {
    ...defaultProps,
    datasource: chartProps.datasource,
    pivotData: transformedPivotData,
  };
}
