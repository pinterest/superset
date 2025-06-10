import { JsonObject, getTimeFormatterForGranularity } from '@superset-ui/core';

import { DEFAULT_NUMBER_FORMAT } from '@superset-ui/chart-controls';
import { DEXChartTransformedProps } from './types';
import EchartsTimeseries from '../../EchartsTimeseries';
import { PivotTableChart } from '@superset-ui/plugin-chart-pivot-table';
import { useSelector } from 'react-redux';

const MIN_LINE_CHART_HEIGHT = 400;

const PIVOT_TABLE_HEIGHT = 200;
const PIVOT_TABLE_AGGREGATE_FUNCTION = 'Sum';
const PIVOT_TABLE_METRICS_LAYOUT = 'COLUMNS';
const PIVOT_TABLE_ROW_ORDER = 'key_a_to_z';
const PIVOT_TABLE_COLUMN_ORDER = 'key_a_to_z';

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
  const PINTEREST_DEX_TIME_COLUMN = useSelector(
    (state: JsonObject) => state.common.conf.PINTEREST_DEX_TIME_COLUMN,
  );

  const pivotTableProps = {
    width,
    height,
    data: pivotData.data,
    groupbyRows: [PINTEREST_DEX_TIME_COLUMN],
    groupbyColumns: groupby,
    metrics: formData.metrics,
    tableRenderer: '',
    colOrder: PIVOT_TABLE_COLUMN_ORDER,
    rowOrder: PIVOT_TABLE_ROW_ORDER,
    aggregateFunction: PIVOT_TABLE_AGGREGATE_FUNCTION,
    transposePivot: false,
    combineMetric: false,
    rowSubtotalPosition: false,
    colSubtotalPosition: false,
    colTotals: false,
    colSubTotals: false,
    rowTotals: true,
    rowSubTotals: false,
    valueFormat: DEFAULT_NUMBER_FORMAT,
    currencyFormat: undefined,
    emitCrossFilters,
    setDataMask,
    selectedFilters: [],
    verboseMap: datasource?.verboseMap || {},
    columnFormats: datasource?.columnFormats || {},
    currencyFormats: {},
    metricsLayout: PIVOT_TABLE_METRICS_LAYOUT,
    metricColorFormatters: [],
    dateFormatters: {
      [xAxis.label]: getTimeFormatterForGranularity(formData.timeGrainSqla),
    },
    onContextMenu,
    timeGrainSqla: formData.timeGrainSqla,
    margin: 100,
    legacy_order_by: false,
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
