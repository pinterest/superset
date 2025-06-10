import { DEXChartTransformedProps } from './types';
import { EchartsTimeseriesChartProps } from '../../types';
import echartsTranformProps from '../../transformProps';

export default function transformProps(
  chartProps: EchartsTimeseriesChartProps,
): DEXChartTransformedProps {
  const defaultProps = echartsTranformProps(chartProps);
  const { queriesData = [] } = chartProps;
  return {
    ...defaultProps,
    datasource: chartProps.datasource,
    pivotData: queriesData[1],
  };
}
