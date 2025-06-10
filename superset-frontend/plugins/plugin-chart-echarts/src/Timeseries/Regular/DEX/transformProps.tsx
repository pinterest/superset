import echartsTranformProps from '../../transformProps';
import { EchartsTimeseriesChartProps } from '../../types';
import { DEXChartTransformedProps } from './types';

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
