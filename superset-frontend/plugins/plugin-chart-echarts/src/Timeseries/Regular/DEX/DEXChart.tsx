import {
  MetricsLayoutEnum,
  PivotTableChart,
} from '@superset-ui/plugin-chart-pivot-table';

import { DEFAULT_NUMBER_FORMAT } from '@superset-ui/chart-controls';
import { DEXChartTransformedProps } from './types';
import EchartsTimeseries from '../../EchartsTimeseries';
import { getTimeFormatterForGranularity } from '@superset-ui/core';

const MIN_LINE_CHART_HEIGHT = 300;

const PIVOT_TABLE_HEIGHT = 400;
const PIVOT_TABLE_AGGREGATE_FUNCTION = 'Sum';
const PIVOT_TABLE_ROW_COLUMN_ORDER = 'key_a_to_z';

export default function DEXChart(props: DEXChartTransformedProps) {
  const {
    formData,
    height,
    width,
    groupby,
    setDataMask,
    onContextMenu,
    xAxis,
    emitCrossFilters,
    datasource,
    pivotData,
  } = props;

  const pivotTableProps = {
    width,
    height,
    data: pivotData.data,
    groupbyRows: groupby,
    groupbyColumns: ['dt'], // TODO (kgopal): Change to use constant
    metrics: Object.keys(pivotData.data[0])
      .map(key => key)
      .filter(key => key !== 'dt' && !groupby.includes(key)), // TODO (kgopal): Change to use constant for dt
    tableRenderer: '',
    colOrder: PIVOT_TABLE_ROW_COLUMN_ORDER,
    rowOrder: PIVOT_TABLE_ROW_COLUMN_ORDER,
    aggregateFunction: PIVOT_TABLE_AGGREGATE_FUNCTION,
    transposePivot: false,
    combineMetric: false,
    rowSubtotalPosition: false,
    colSubtotalPosition: false,
    colTotals: true, // TODO (kgopal): Change to false when time comparison percent change applied
    colSubTotals: false,
    rowTotals: false,
    rowSubTotals: false,
    valueFormat: DEFAULT_NUMBER_FORMAT,
    currencyFormat: {
      symbol: '',
      symbolPosition: '',
    },
    emitCrossFilters,
    setDataMask,
    verboseMap: datasource?.verboseMap || {},
    columnFormats: datasource?.columnFormats || {},
    currencyFormats: {},
    metricsLayout: MetricsLayoutEnum.COLUMNS,
    metricColorFormatters: [],
    dateFormatters: {
      [xAxis.label]: getTimeFormatterForGranularity(formData.timeGrainSqla),
    },
    onContextMenu,
    timeGrainSqla: formData.timeGrainSqla,
    margin: 100,
    legacy_order_by: null,
    order_desc: false,
  };

  return (
    <div style={{ position: 'relative', height, width }}>
      <EchartsTimeseries
        {...props}
        height={
          height - PIVOT_TABLE_HEIGHT > MIN_LINE_CHART_HEIGHT
            ? height - PIVOT_TABLE_HEIGHT
            : height
        }
      />
      <PivotTableChart {...pivotTableProps} height={PIVOT_TABLE_HEIGHT} />
    </div>
  );
}
