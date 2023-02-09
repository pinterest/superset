import { ECBasicOption } from 'echarts/types/src/util/types';
import transformProps from '../../transformProps';
import {
  EchartsTimeseriesChartProps,
  EchartsTimeseriesSeriesType,
} from '../../types';
import { getTooltipConfig } from './tooltip';

export const pinterestLineTransformProps = (
  chartProps: EchartsTimeseriesChartProps,
) => {
  const transformedProps = transformProps({
    ...chartProps,
    formData: {
      ...chartProps.formData,
      seriesType: EchartsTimeseriesSeriesType.Line,
    },
  });

  const newtransformedProps = {
    ...transformedProps,
    echartOptions: {
      ...(transformedProps.echartOptions as ECBasicOption),
      tooltip: getTooltipConfig(chartProps),
    },
  };
  return newtransformedProps;
};
