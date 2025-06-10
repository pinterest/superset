import { ChartDataResponseResult, Datasource } from '@superset-ui/core';

import { TimeseriesChartTransformedProps } from '../../types';

export type DEXChartTransformedProps = TimeseriesChartTransformedProps & {
  pivotData: ChartDataResponseResult;
  datasource: Datasource;
};
