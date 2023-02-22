// Referenced from ../../Timeseries/Regular/Line
import {
  AnnotationType,
  Behavior,
  ChartMetadata,
  ChartPlugin,
  FeatureFlag,
  isFeatureEnabled,
  t,
} from '@superset-ui/core';
import buildQuery from '../../buildQuery';
import controlPanel from './controlPanel';
import thumbnail from './images/thumbnail.png';
import {
  EchartsTimeseriesChartProps,
  EchartsTimeseriesFormData,
} from '../../types';
import example1 from './images/example1.png';
import example2 from './images/example2.png';
import { pinterestLineTransformProps } from './transformProps';

export default class EchartsTimeseriesLineChartPlugin extends ChartPlugin<
  EchartsTimeseriesFormData,
  EchartsTimeseriesChartProps
> {
  constructor() {
    const chartName = isFeatureEnabled(FeatureFlag.GENERIC_CHART_AXES)
      ? 'Pinalytics line chart'
      : 'Pinalytics time-series line chart';
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../../EchartsTimeseries'),
      metadata: new ChartMetadata({
        behaviors: [Behavior.INTERACTIVE_CHART],
        category: t('Evolution'),
        credits: ['https://echarts.apache.org'],
        description: `[Beta] ${chartName} is a line chart very similar to the existing Superset line chart, however it has some additional Pinterest-specific features (e.g. delta table tooltip).`,
        exampleGallery: [{ url: example1 }, { url: example2 }],
        supportedAnnotationTypes: [
          AnnotationType.Event,
          AnnotationType.Formula,
          AnnotationType.Interval,
          AnnotationType.Timeseries,
        ],
        name: isFeatureEnabled(FeatureFlag.GENERIC_CHART_AXES)
          ? t('Pinalytics Line Chart')
          : t('Pinalytics Time-series Line Chart'),
        tags: [
          t('ECharts'),
          t('Predictive'),
          t('Advanced-Analytics'),
          t('Aesthetic'),
          t('Line'),
          t('Popular'),
          t('Pinterest'),
          t('Beta'),
        ],
        thumbnail,
      }),
      transformProps: pinterestLineTransformProps,
    });
  }
}
